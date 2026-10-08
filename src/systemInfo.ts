export interface SystemCpuCounters {
    values: number[]
}

export interface SystemMemory {
    totalBytes: number
    availableBytes: number
    swapTotalBytes: number
    swapFreeBytes: number
}

export interface SystemNetworkCounters {
    name: string
    receivedBytes: number
    sentBytes: number
}

export interface SystemProcess {
    pid: number
    memoryBytes: number
    cpuPercent: number
    command: string
}

export interface SystemFilesystem {
    path: string
    availableBytes: number
    totalBytes: number
}

export interface RawSystemSample {
    uptimeSeconds: number
    loadAverages: number[]
    cpu: SystemCpuCounters
    memory: SystemMemory
    networks: SystemNetworkCounters[]
    processes: SystemProcess[]
    filesystems: SystemFilesystem[]
}

// 只读取 Linux 内核统计、进程列表和本地挂载，不向用户终端写入命令。
const SYSTEM_INFO_SCRIPT = String.raw`
LC_ALL=C
export LC_ALL
if [ ! -r /proc/stat ] || [ ! -r /proc/meminfo ] || [ ! -r /proc/net/dev ]; then
    printf 'TBSP-UNSUPPORTED\n'
    exit 0
fi
sample=0
while :; do
    printf 'TBSP-BEGIN\n'
    awk '{ printf "SYS\t%.0f\n", $1 }' /proc/uptime
    awk '{ printf "LOAD\t%s\t%s\t%s\n", $1, $2, $3 }' /proc/loadavg
    awk '$1 == "cpu" { printf "CPU"; for (i = 2; i <= 9; i++) printf "\t%.0f", $i; printf "\n"; exit }' /proc/stat
    awk '
        /^MemTotal:/ { total = $2 }
        /^MemAvailable:/ { available = $2 }
        /^MemFree:/ { free = $2 }
        /^SwapTotal:/ { swapTotal = $2 }
        /^SwapFree:/ { swapFree = $2 }
        END {
            if (!available) available = free
            printf "MEM\t%.0f\t%.0f\t%.0f\t%.0f\n", total, available, swapTotal, swapFree
        }
    ' /proc/meminfo
    awk -F: '
        NR > 2 {
            name = $1
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", name)
            counters = $2
            sub(/^[[:space:]]+/, "", counters)
            count = split(counters, values, /[[:space:]]+/)
            if (count >= 9) printf "NET\t%s\t%.0f\t%.0f\n", name, values[1], values[9]
        }
    ' /proc/net/dev
    processes=$(ps -eo pid=,rss=,pcpu=,comm= --sort=-rss 2>/dev/null | head -n 8)
    if [ -z "$processes" ]; then
        processes=$(ps -eo pid=,rss=,pcpu=,comm= 2>/dev/null | head -n 8)
    fi
    printf '%s\n' "$processes" | awk '
        NF >= 4 {
            command = $4
            for (i = 5; i <= NF; i++) command = command " " $i
            printf "PROC\t%.0f\t%.0f\t%.2f\t%s\n", $1, $2, $3, command
        }
    '
    if [ "$sample" -eq 0 ]; then
        df -Pk -l 2>/dev/null | awk '
            NR > 1 && NF >= 6 {
                printf "FS\t%s\t%.0f\t%.0f\n", $6, $4, $2
                if (++count == 240) exit
            }
        '
    fi
    printf 'TBSP-END\n'
    sample=$((sample + 1))
    if [ "$sample" -eq 5 ]; then sample=0; fi
    sleep 2
done
`

// 固定脚本通过 sh 执行，并转义单引号以兼容不同远程登录 shell。
function quoteShellArgument (value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`
}

export const SYSTEM_INFO_EXEC_COMMAND = `/bin/sh -c ${quoteShellArgument(SYSTEM_INFO_SCRIPT)}`

const MAX_PROCESSES = 8
const MAX_FILESYSTEMS = 240

/** 从一轮完整输出解析 Linux 系统数据，忽略不完整或异常的记录。 */
export function parseSystemSample (
    lines: string[],
    previousFilesystems: SystemFilesystem[] = [],
): RawSystemSample|null {
    let uptimeSeconds: number|undefined
    let loadAverages: number[] = []
    let cpu: SystemCpuCounters|undefined
    let memory: SystemMemory|undefined
    const networks: SystemNetworkCounters[] = []
    const processes: SystemProcess[] = []
    const filesystems: SystemFilesystem[] = []

    for (const line of lines) {
        const fields = line.split('\t')
        const number = (value: string|undefined): number|undefined => {
            if (value === undefined || value.trim() === '') {
                return undefined
            }
            const parsed = Number(value)
            return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
        }

        switch (fields[0]) {
            case 'SYS':
                uptimeSeconds = number(fields[1])
                break
            case 'LOAD':
                loadAverages = fields.slice(1, 4).map(value => number(value) ?? 0)
                break
            case 'CPU': {
                const values = fields.slice(1, 9).map(value => number(value))
                if (values.length === 8 && values.every(value => value !== undefined)) {
                    cpu = { values: values as number[] }
                }
                break
            }
            case 'MEM': {
                const values = fields.slice(1, 5).map(value => number(value))
                if (values.length === 4 && values.every(value => value !== undefined)) {
                    const [total, available, swapTotal, swapFree] = values as number[]
                    memory = {
                        totalBytes: total * 1024,
                        availableBytes: Math.min(total, available) * 1024,
                        swapTotalBytes: swapTotal * 1024,
                        swapFreeBytes: Math.min(swapTotal, swapFree) * 1024,
                    }
                }
                break
            }
            case 'NET': {
                const receivedBytes = number(fields[2])
                const sentBytes = number(fields[3])
                if (fields[1] && receivedBytes !== undefined && sentBytes !== undefined) {
                    networks.push({ name: fields[1], receivedBytes, sentBytes })
                }
                break
            }
            case 'PROC': {
                const pid = number(fields[1])
                const memoryKb = number(fields[2])
                const cpuPercent = number(fields[3])
                const command = fields.slice(4).join('\t').trim()
                if (pid !== undefined && memoryKb !== undefined && cpuPercent !== undefined && command) {
                    processes.push({ pid, memoryBytes: memoryKb * 1024, cpuPercent, command })
                    if (processes.length === MAX_PROCESSES) {
                        break
                    }
                }
                break
            }
            case 'FS': {
                const availableKb = number(fields[2])
                const totalKb = number(fields[3])
                if (fields[1] && availableKb !== undefined && totalKb !== undefined) {
                    filesystems.push({
                        path: fields.slice(1, 2).join(''),
                        availableBytes: Math.min(availableKb, totalKb) * 1024,
                        totalBytes: totalKb * 1024,
                    })
                    if (filesystems.length === MAX_FILESYSTEMS) {
                        break
                    }
                }
                break
            }
        }
    }

    if (uptimeSeconds === undefined || !cpu || !memory || loadAverages.length !== 3) {
        return null
    }

    return {
        uptimeSeconds,
        loadAverages,
        cpu,
        memory,
        networks,
        processes,
        filesystems: filesystems.length ? filesystems : previousFilesystems,
    }
}

/** 用终端常见的紧凑单位显示字节数。 */
export function formatSystemBytes (bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return '0 B'
    }
    const units = ['B', 'K', 'M', 'G', 'T']
    let value = bytes
    let unit = 0
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024
        unit++
    }
    return `${unit === 0 ? Math.round(value) : value.toFixed(1)}${units[unit]}`
}

/** 将运行秒数压缩为侧栏标题易读的天、小时和分钟。 */
export function formatSystemUptime (seconds: number): string {
    const minutes = Math.floor(Math.max(0, seconds) / 60)
    const days = Math.floor(minutes / 1440)
    const hours = Math.floor(minutes % 1440 / 60)
    const remainingMinutes = minutes % 60
    if (days > 0) {
        return `${days}d ${hours}h`
    }
    if (hours > 0) {
        return `${hours}h ${remainingMinutes}m`
    }
    return `${remainingMinutes}m`
}
