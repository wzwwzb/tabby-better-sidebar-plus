import './systemInfo.component.scss'
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core'
import { AppService, BaseTabComponent, SplitTabComponent } from 'tabby-core'
import { Subscription, merge, timer } from 'rxjs'
import { SSHTabComponent } from 'tabby-ssh'
import { SidebarPlusI18nService } from '../i18n'
import { isLiveSSHTab, isSSHTab } from '../tabs'
import {
    formatSystemBytes,
    formatSystemUptime,
    parseSystemSample,
    RawSystemSample,
    SystemCpuCounters,
    SystemFilesystem,
    SystemMemory,
    SystemProcess,
    SYSTEM_INFO_EXEC_COMMAND,
} from '../systemInfo'

interface RemoteExecChannel {
    data$: {
        subscribe: (observer: {
            next: (data: Uint8Array) => void
            error?: (error: unknown) => void
        }) => Subscription
    }
    closed$: { subscribe: (handler: () => void) => Subscription }
    requestExec: (command: string) => Promise<void>
    close: () => Promise<void>
}

interface RemoteExecClient {
    openSessionChannel: () => Promise<unknown>
    activateChannel: (channel: unknown) => Promise<RemoteExecChannel>
}

interface NetworkRate {
    name: string
    receivedBytesPerSecond: number
    sentBytesPerSecond: number
}

interface NetworkChartPoint extends NetworkRate {
    index: number
    receivedHeight: number
    sentHeight: number
}

@Component({
    selector: 'sidebar-plus-system-info',
    template: require('./systemInfo.component.pug'),
})
/** 跟随当前 SSH 焦点，用独立只读命令通道显示远程 Linux 指标。 */
export class SidebarPlusSystemInfoComponent implements OnInit, OnDestroy {
    sessionName = ''
    status: 'waiting'|'connecting'|'live'|'error' = 'waiting'
    message = ''
    uptimeLabel = ''
    loadLabel = ''
    cpuPercent = 0
    memory: SystemMemory|null = null
    processes: SystemProcess[] = []
    filesystems: SystemFilesystem[] = []
    interfaces: string[] = []
    networkRates: NetworkRate[] = []
    networkPoints: NetworkChartPoint[] = []
    selectedInterface = ''

    private destroyed = false
    private boundTab: SSHTabComponent|null = null
    private boundSession: SSHTabComponent['sshSession']|null = null
    private appSubscription: Subscription|null = null
    private splitFocusSubscription: Subscription|null = null
    private channelSubscription: Subscription|null = null
    private channel: RemoteExecChannel|null = null
    private reconnectToken = 0
    private textDecoder = new TextDecoder()
    private lastCpu: SystemCpuCounters|null = null
    private lastNetwork = new Map<string, { received: number, sent: number }>()
    private lastSampleTime = 0
    private sampleReceived = false
    private incoming = ''
    private pendingSample: string[]|null = null

    constructor (
        private app: AppService,
        private zone: NgZone,
        private i18n: SidebarPlusI18nService,
    ) { }

    ngOnInit (): void {
        this.appSubscription = merge(
            this.app.activeTabChange$,
            this.app.tabsChanged$,
            this.app.tabClosed$,
            this.app.tabRemoved$,
            timer(0, 1000),
        ).subscribe(() => this.syncSession())
    }

    ngOnDestroy (): void {
        this.destroyed = true
        this.appSubscription?.unsubscribe()
        this.splitFocusSubscription?.unsubscribe()
        this.closeMonitor()
    }

    formatBytes (bytes: number): string {
        return formatSystemBytes(bytes)
    }

    formatUptime (seconds: number): string {
        return formatSystemUptime(seconds)
    }

    get memoryPercent (): number {
        if (!this.memory?.totalBytes) {
            return 0
        }
        return Math.round((this.memory.totalBytes - this.memory.availableBytes) / this.memory.totalBytes * 100)
    }

    get swapPercent (): number {
        if (!this.memory?.swapTotalBytes) {
            return 0
        }
        return Math.round((this.memory.swapTotalBytes - this.memory.swapFreeBytes) / this.memory.swapTotalBytes * 100)
    }

    get selectedNetworkRate (): NetworkRate|null {
        return this.networkRates.find(rate => rate.name === this.selectedInterface) ?? null
    }

    get networkScale (): number {
        return Math.max(1, ...this.networkPoints.flatMap(point => [point.receivedBytesPerSecond, point.sentBytesPerSecond]))
    }

    private resolveFocusedTab (): SSHTabComponent|null {
        let tab: BaseTabComponent|null = this.app.activeTab
        if (tab instanceof SplitTabComponent) {
            tab = tab.getFocusedTab()
        }
        return isSSHTab(tab) && isLiveSSHTab(tab) ? tab : null
    }

    private watchSplitFocus (): void {
        this.splitFocusSubscription?.unsubscribe()
        this.splitFocusSubscription = null
        const active = this.app.activeTab
        if (active instanceof SplitTabComponent) {
            this.splitFocusSubscription = active.focusChanged$.subscribe(() => this.syncSession())
        }
    }

    private syncSession (): void {
        this.watchSplitFocus()
        const tab = this.resolveFocusedTab()
        const session = tab?.sshSession ?? null
        if (tab === this.boundTab && session === this.boundSession) {
            this.updateSessionName(tab)
            return
        }

        this.closeMonitor()
        this.boundTab = tab
        this.boundSession = session
        this.sessionName = ''
        this.resetMetrics()

        if (!tab || !session) {
            this.status = 'waiting'
            this.message = ''
            return
        }
        this.updateSessionName(tab)
        this.status = 'connecting'
        this.message = ''
        void this.startMonitor(session)
    }

    private updateSessionName (tab: SSHTabComponent|null): void {
        if (!tab) {
            this.sessionName = ''
            return
        }
        const profile = (tab as unknown as { profile?: { name?: string } }).profile
        this.sessionName = tab.customTitle
            || tab.topmostParent?.customTitle
            || profile?.name
            || tab.title
            || this.i18n.t('Active SSH session')
    }

    private async startMonitor (session: NonNullable<SSHTabComponent['sshSession']>): Promise<void> {
        const token = ++this.reconnectToken
        const ssh = session.ssh as unknown as RemoteExecClient
        let channel: RemoteExecChannel|null = null
        try {
            const opened = await ssh.openSessionChannel()
            channel = await ssh.activateChannel(opened)
            if (this.destroyed || token !== this.reconnectToken) {
                void channel.close()
                return
            }
            this.channel = channel
            this.channelSubscription = new Subscription()
            this.channelSubscription.add(channel.data$.subscribe({
                next: data => this.zone.run(() => this.handleData(token, data)),
                error: () => {
                    if (token === this.reconnectToken) {
                        const message = this.sampleReceived
                            ? this.i18n.t('The remote system monitor stopped.')
                            : this.i18n.t('System information is available for Linux SSH servers only.')
                        this.zone.run(() => this.fail(message))
                    }
                },
            }))
            this.channelSubscription.add(channel.closed$.subscribe(() => {
                if (token === this.reconnectToken) {
                    const message = this.sampleReceived
                        ? this.i18n.t('The remote system monitor stopped.')
                        : this.i18n.t('System information is available for Linux SSH servers only.')
                    this.zone.run(() => this.fail(message))
                }
            }))
            await channel.requestExec(SYSTEM_INFO_EXEC_COMMAND)
        } catch {
            if (token === this.reconnectToken && !this.destroyed) {
                this.zone.run(() => this.fail(this.i18n.t('This SSH server does not allow remote commands.')))
            }
            if (channel && this.channel !== channel) {
                void channel.close()
            }
        }
    }

    private handleData (token: number, data: Uint8Array): void {
        if (token !== this.reconnectToken) {
            return
        }
        this.incoming += this.textDecoder.decode(data, { stream: true })
        if (this.incoming.length > 256 * 1024) {
            this.incoming = ''
            this.pendingSample = null
            return
        }
        const lines = this.incoming.split('\n')
        this.incoming = lines.pop() ?? ''
        for (const line of lines) {
            this.handleLine(line.replace(/\r$/, ''))
        }
    }

    private handleLine (line: string): void {
        if (line === 'TBSP-BEGIN') {
            this.pendingSample = []
            return
        }
        if (line === 'TBSP-END') {
            if (!this.pendingSample) {
                return
            }
            const sample = parseSystemSample(this.pendingSample, this.filesystems)
            this.pendingSample = null
            if (!sample) {
                this.fail(this.i18n.t('The remote system returned unreadable statistics.'))
                return
            }
            this.applySample(sample)
            return
        }
        if (line === 'TBSP-UNSUPPORTED') {
            this.fail(this.i18n.t('System information is available for Linux SSH servers only.'))
            return
        }
        if (this.pendingSample && line) {
            this.pendingSample.push(line)
        }
    }

    private applySample (sample: RawSystemSample): void {
        this.sampleReceived = true
        const now = Date.now()
        if (this.lastCpu) {
            const previousTotal = this.lastCpu.values.reduce((sum, value) => sum + value, 0)
            const currentTotal = sample.cpu.values.reduce((sum, value) => sum + value, 0)
            const previousIdle = this.lastCpu.values[3] + this.lastCpu.values[4]
            const currentIdle = sample.cpu.values[3] + sample.cpu.values[4]
            const totalElapsed = currentTotal - previousTotal
            if (totalElapsed > 0) {
                this.cpuPercent = Math.max(0, Math.min(100, Math.round((1 - (currentIdle - previousIdle) / totalElapsed) * 100)))
            }
        }

        const elapsed = this.lastSampleTime > 0 ? Math.max(.1, (now - this.lastSampleTime) / 1000) : 2
        const rates = sample.networks.map(network => {
            const previous = this.lastNetwork.get(network.name)
            return {
                name: network.name,
                receivedBytesPerSecond: previous && network.receivedBytes >= previous.received
                    ? (network.receivedBytes - previous.received) / elapsed
                    : 0,
                sentBytesPerSecond: previous && network.sentBytes >= previous.sent
                    ? (network.sentBytes - previous.sent) / elapsed
                    : 0,
            }
        })

        this.lastCpu = sample.cpu
        this.lastNetwork = new Map(sample.networks.map(network => [network.name, {
            received: network.receivedBytes,
            sent: network.sentBytes,
        }]))
        this.lastSampleTime = now
        this.uptimeLabel = this.formatUptime(sample.uptimeSeconds)
        this.loadLabel = sample.loadAverages.map(value => value.toFixed(2)).join(', ')
        this.memory = sample.memory
        this.processes = sample.processes
        this.filesystems = sample.filesystems
        this.networkRates = rates
        this.interfaces = rates.map(rate => rate.name)
        if (!rates.some(rate => rate.name === this.selectedInterface)) {
            this.selectedInterface = rates.find(rate => rate.name !== 'lo')?.name ?? rates[0]?.name ?? ''
            this.networkPoints = []
        }

        const selected = this.selectedNetworkRate
        if (selected) {
            const points = [...this.networkPoints, {
                ...selected,
                index: 0,
                receivedHeight: 1,
                sentHeight: 1,
            }].slice(-60)
            const start = 60 - points.length
            const scale = Math.max(1, ...points.flatMap(point => [point.receivedBytesPerSecond, point.sentBytesPerSecond]))
            this.networkPoints = points.map((point, index) => ({
                ...point,
                index: start + index,
                receivedHeight: Math.max(1, point.receivedBytesPerSecond / scale * 56),
                sentHeight: Math.max(1, point.sentBytesPerSecond / scale * 56),
            }))
        }
        this.status = 'live'
    }

    selectInterface (name: string): void {
        this.selectedInterface = this.interfaces.includes(name) ? name : ''
        this.networkPoints = []
    }

    private resetMetrics (): void {
        this.uptimeLabel = ''
        this.loadLabel = ''
        this.cpuPercent = 0
        this.memory = null
        this.processes = []
        this.filesystems = []
        this.interfaces = []
        this.networkRates = []
        this.networkPoints = []
        this.selectedInterface = ''
        this.lastCpu = null
        this.lastNetwork.clear()
        this.lastSampleTime = 0
        this.sampleReceived = false
        this.incoming = ''
        this.textDecoder = new TextDecoder()
        this.pendingSample = null
    }

    private closeMonitor (): void {
        // 切换会话或视图时先作废旧回调，再关闭通道。
        this.reconnectToken++
        this.channelSubscription?.unsubscribe()
        this.channelSubscription = null
        const channel = this.channel
        this.channel = null
        if (channel) {
            void channel.close().catch(() => undefined)
        }
    }

    private fail (message: string): void {
        this.closeMonitor()
        this.status = 'error'
        this.message = message
    }
}
