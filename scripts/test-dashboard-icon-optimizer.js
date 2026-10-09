// 确认 SVG 体积优化只归一化绘图数值，不破坏隔离样式和引用 ID。
const assert = require('node:assert/strict')
const { DOMParser } = require('@xmldom/xmldom')
const { optimizeDashboardIcons, optimizeDashboardSvg } = require('./dashboardIconsOptimizer')

const svg = '<svg xmlns="http://www.w3.org/2000/svg" class="dbi-test" viewBox="0 0 24 24"><defs><linearGradient id="dbi-test-gradient"><stop offset="0" stop-color="#000"/></linearGradient></defs><style>.dbi-test .shape{fill:url(#dbi-test-gradient)}</style><path class="shape" d="M0 0 L10.123456 10.123456 L0 10 Z"/></svg>'
const optimized = optimizeDashboardSvg(svg)
assert.ok(optimized.length < svg.length)
assert.match(optimized, /id="dbi-test-gradient"/)
assert.match(optimized, /\.dbi-test \.shape/)
assert.match(optimized, /url\(#dbi-test-gradient\)/)
const document = new DOMParser().parseFromString(optimized, 'image/svg+xml')
assert.equal(document.documentElement.localName, 'svg')

const malformed = '<svg>'
const data = { logo: { aliases: [], variants: { default: svg, dark: malformed } } }
const report = optimizeDashboardIcons(data)
assert.equal(report.optimizedSvgCount, 1)
assert.deepEqual(report.skipped, ['logo:dark'])
assert.equal(data.logo.variants.dark, malformed)

console.log('SVG 压缩会保留 ID、CSS 与异常源文件回退。')
