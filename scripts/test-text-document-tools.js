// 用真实解析库覆盖常见配置文件的检查、定位和格式化路径。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const ts = require('typescript')
const xmldom = require('@xmldom/xmldom')

global.DOMParser = xmldom.DOMParser
global.XMLSerializer = xmldom.XMLSerializer
global.Node = xmldom.Node

const projectRoot = path.resolve(__dirname, '..')
const sourcePath = path.join(projectRoot, 'src', 'textDocumentTools.ts')
const output = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
    compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
    },
}).outputText
const compiled = new Module(sourcePath)
compiled.filename = sourcePath
compiled.paths = Module._nodeModulePaths(projectRoot)
compiled._compile(output, sourcePath)

const { detectTextDocumentFormat, formatTextDocument, validateTextDocument } = compiled.exports

assert.equal(detectTextDocumentFormat('app.json'), 'json')
assert.equal(detectTextDocumentFormat('compose.yaml'), 'yaml')
assert.equal(detectTextDocumentFormat('settings.ini'), 'ini')
assert.equal(detectTextDocumentFormat('document.xml'), 'xml')
assert.equal(detectTextDocumentFormat('index.html'), 'html')
assert.equal(detectTextDocumentFormat('notes.txt'), null)

assert.deepEqual(validateTextDocument('json', '{"port": 22}'), [])
const jsonIssues = validateTextDocument('json', '{\n  "port": }')
assert.equal(jsonIssues[0].line, 2)
assert.equal(jsonIssues[0].column, 12)
assert.match(formatTextDocument('json', '{"port":22}'), /\n  "port": 22\n/)

assert.deepEqual(validateTextDocument('yaml', 'name: app\nports:\n  - 80\n'), [])
assert.equal(validateTextDocument('yaml', 'name: [\n  - app')[0].line, 2)
assert.match(formatTextDocument('yaml', '# service\nname: app\nports: [80,443]'), /# service\nname: app/)
assert.deepEqual(validateTextDocument('yaml', formatTextDocument('yaml', 'first: true\n---\nsecond: true\n')), [])

assert.deepEqual(validateTextDocument('ini', '[server]\nport=22\n'), [])
assert.equal(validateTextDocument('ini', '[server\nport=22')[0].line, 1)
assert.match(formatTextDocument('ini', '[server]\nport=22'), /port = 22\n/)

assert.deepEqual(validateTextDocument('xml', '<root><child>value</child></root>'), [])
const previousConsoleError = console.error
let xmlIssues
try {
    console.error = () => {}
    xmlIssues = validateTextDocument('xml', '<root>\n  <child>value</root>')
} finally {
    console.error = previousConsoleError
}
assert.ok(xmlIssues.length)
assert.equal(xmlIssues[0].line, 2)
assert.ok(xmlIssues[0].column > 1)
assert.match(formatTextDocument('xml', '<?xml version="1.0"?><root><child>value</child></root>'), /<\?xml version="1.0"\?>\n<root>\n  <child>value<\/child>\n<\/root>/)

assert.deepEqual(validateTextDocument('html', '<div><p>Hello</p><p>World</p></div>'), [])
const htmlIssues = validateTextDocument('html', '<div><span></div>')
assert.ok(htmlIssues.some(issue => issue.message.includes('Unclosed <span>')))
assert.ok(validateTextDocument('html', '<div id="a" id="b"></div>').length)
assert.match(formatTextDocument('html', '<div><p>Hello</p><p>World</p></div>'), /<div>\n  <p>Hello<\/p>\n  <p>World<\/p>\n<\/div>/)

console.log('JSON、YAML、INI、XML 和 HTML 检查/格式化测试通过。')
