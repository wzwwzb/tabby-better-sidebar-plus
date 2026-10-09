const { optimize } = require('svgo')

/** 只压缩数值和绘图指令，保留图标 ID、CSS、颜色与结构。 */
const SVG_OPTIMIZER_PLUGINS = [
    'cleanupAttrs',
    { name: 'cleanupNumericValues', params: { floatPrecision: 3 } },
    { name: 'convertPathData', params: { floatPrecision: 3, transformPrecision: 5 } },
    { name: 'convertTransform', params: { floatPrecision: 5 } },
    'removeEmptyAttrs',
    'sortAttrs',
]

/** 用安全的数值归一化减少离线服务图标的存储体积。 */
function optimizeDashboardSvg (svg) {
    return optimize(svg, { plugins: SVG_OPTIMIZER_PLUGINS }).data
}

/** 批量优化已分组图标；无法解析的原图保留并记录，不阻断打包。 */
function optimizeDashboardIcons (data) {
    let optimizedSvgCount = 0
    let optimizedBytesSaved = 0
    const skipped = []

    for (const [name, entry] of Object.entries(data)) {
        for (const [variant, svg] of Object.entries(entry.variants)) {
            try {
                const optimized = optimizeDashboardSvg(svg)
                entry.variants[variant] = optimized
                optimizedSvgCount++
                optimizedBytesSaved += Buffer.byteLength(svg, 'utf8') - Buffer.byteLength(optimized, 'utf8')
            } catch {
                skipped.push(`${name}:${variant}`)
            }
        }
    }

    return { optimizedSvgCount, optimizedBytesSaved, skipped }
}

module.exports = { optimizeDashboardSvg, optimizeDashboardIcons }
