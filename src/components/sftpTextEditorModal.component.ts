import './sftpTextEditorModal.component.scss'
import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core'
import { detectTextDocumentFormat, formatTextDocument, validateTextDocument } from '../textDocumentTools'
import type { TextDocumentFormat, TextDocumentIssue } from '../textDocumentTools'

/** 在 Tabby 内编辑一个远程 UTF-8 文本文件。 */
@Component({
    selector: 'sidebar-plus-sftp-text-editor-modal',
    template: require('./sftpTextEditorModal.component.pug'),
})
export class SftpTextEditorModalComponent implements AfterViewInit, OnDestroy {
    @Input() fileName = ''
    @Input() remotePath = ''
    @Input() initialText = ''
    @Input() text = ''
    @Input() saveText: ((text: string) => Promise<boolean>)|null = null
    @Input() closeWindow: (() => void)|null = null

    @ViewChild('field') field: ElementRef<HTMLTextAreaElement>
    @ViewChild('window') windowRef: ElementRef<HTMLElement>

    saving = false
    saveFailed = false
    confirmingDiscard = false
    confirmingSyntaxSave = false
    syntaxIssues: TextDocumentIssue[] = []
    syntaxChecked = false
    syntaxPending = false
    formatFailure = ''

    private resizeStart: { pointerId: number, x: number, y: number, width: number, height: number }|null = null
    private syntaxTimer: ReturnType<typeof setTimeout>|null = null

    /** 依据拖动距离连续调整窗口尺寸，并限制在当前视口范围内。 */
    private readonly onResizePointerMove = (event: PointerEvent): void => {
        const start = this.resizeStart
        const panel = this.windowRef?.nativeElement
        if (!start || !panel || event.pointerId !== start.pointerId) {
            return
        }

        this.setWindowSize(start.width + event.clientX - start.x, start.height + event.clientY - start.y)
    }

    /** 结束拖动并移除全局监听，避免窗口关闭后残留事件。 */
    private readonly onResizePointerEnd = (event: PointerEvent): void => {
        if (this.resizeStart?.pointerId !== event.pointerId) {
            return
        }
        document.removeEventListener('pointermove', this.onResizePointerMove)
        document.removeEventListener('pointerup', this.onResizePointerEnd)
        document.removeEventListener('pointercancel', this.onResizePointerEnd)
        this.resizeStart = null
    }

    /** 动画完成后聚焦文本区，便于立即编辑。 */
    ngAfterViewInit (): void {
        setTimeout(() => this.field?.nativeElement.focus())
        this.onTextChanged()
    }

    get syntaxFormat (): TextDocumentFormat|null {
        return detectTextDocumentFormat(this.fileName)
    }

    /** 文本变化后防抖检查，避免每次按键都解析大型配置文件。 */
    onTextChanged (): void {
        this.confirmingSyntaxSave = false
        this.formatFailure = ''
        if (this.syntaxTimer) {
            clearTimeout(this.syntaxTimer)
            this.syntaxTimer = null
        }

        if (!this.syntaxFormat) {
            this.syntaxIssues = []
            this.syntaxChecked = true
            this.syntaxPending = false
            return
        }

        this.syntaxChecked = false
        this.syntaxPending = true
        this.syntaxTimer = setTimeout(() => this.checkSyntax(), 350)
    }

    /** 立即检查当前内容并更新可点击的行列诊断。 */
    checkSyntax (): void {
        if (this.syntaxTimer) {
            clearTimeout(this.syntaxTimer)
            this.syntaxTimer = null
        }
        this.syntaxPending = false
        const format = this.syntaxFormat
        if (!format) {
            this.syntaxIssues = []
            this.syntaxChecked = true
            return
        }

        try {
            this.syntaxIssues = validateTextDocument(format, this.text)
        } catch (error) {
            this.syntaxIssues = [{
                line: 1,
                column: 1,
                message: error instanceof Error ? error.message : String(error),
            }]
        }
        this.syntaxChecked = true
    }

    /** 只在语法检查通过后格式化，并立即重新检查格式化结果。 */
    formatText (): void {
        this.checkSyntax()
        const format = this.syntaxFormat
        if (!format || this.syntaxIssues.length) {
            return
        }
        try {
            this.text = formatTextDocument(format, this.text)
            this.formatFailure = ''
            this.confirmingSyntaxSave = false
            this.checkSyntax()
        } catch (error) {
            this.formatFailure = error instanceof Error ? error.message : String(error)
        }
    }

    /** 点击诊断后把光标移动到对应的行列位置。 */
    jumpToSyntaxIssue (issue: TextDocumentIssue): void {
        const field = this.field?.nativeElement
        if (!field) {
            return
        }
        let offset = 0
        let line = 1
        while (line < issue.line && offset < this.text.length) {
            const character = this.text[offset++]
            if (character === '\r') {
                if (this.text[offset] === '\n') {
                    offset++
                }
                line++
            } else if (character === '\n') {
                line++
            }
        }
        offset = Math.min(this.text.length, offset + Math.max(0, issue.column - 1))
        field.focus()
        field.setSelectionRange(offset, Math.min(this.text.length, offset + 1))
    }

    /** 从右下角开始鼠标缩放，不触发标题栏的窗口拖动。 */
    startResize (event: PointerEvent): void {
        if (event.button !== 0 || !this.windowRef) {
            return
        }
        event.preventDefault()
        event.stopPropagation()
        const panel = this.windowRef.nativeElement
        const rect = panel.getBoundingClientRect()
        this.resizeStart = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            width: rect.width,
            height: rect.height,
        }
        ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
        document.addEventListener('pointermove', this.onResizePointerMove)
        document.addEventListener('pointerup', this.onResizePointerEnd)
        document.addEventListener('pointercancel', this.onResizePointerEnd)
    }

    /** 支持用键盘方向键微调窗口大小，Shift 可加快调整幅度。 */
    resizeWithKeyboard (event: KeyboardEvent): void {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            return
        }
        const panel = this.windowRef?.nativeElement
        if (!panel) {
            return
        }
        event.preventDefault()
        const rect = panel.getBoundingClientRect()
        const step = event.shiftKey ? 64 : 16
        const widthDelta = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0
        const heightDelta = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0
        this.setWindowSize(rect.width + widthDelta, rect.height + heightDelta)
    }

    /** 按样式声明的最小与最大尺寸设置窗口，确保鼠标和键盘行为一致。 */
    private setWindowSize (width: number, height: number): void {
        const panel = this.windowRef?.nativeElement
        if (!panel) {
            return
        }
        const rect = panel.getBoundingClientRect()
        const styles = window.getComputedStyle(panel)
        const minimumWidth = parseFloat(styles.minWidth)
        const minimumHeight = parseFloat(styles.minHeight)
        const maximumWidth = Math.max(minimumWidth, Math.min(parseFloat(styles.maxWidth), window.innerWidth - rect.left - 12))
        const maximumHeight = Math.max(minimumHeight, Math.min(parseFloat(styles.maxHeight), window.innerHeight - rect.top - 12))
        panel.style.width = `${Math.max(minimumWidth, Math.min(maximumWidth, width))}px`
        panel.style.height = `${Math.max(minimumHeight, Math.min(maximumHeight, height))}px`
    }

    /** 组件被关闭时一并清理缩放监听。 */
    ngOnDestroy (): void {
        if (this.syntaxTimer) {
            clearTimeout(this.syntaxTimer)
        }
        document.removeEventListener('pointermove', this.onResizePointerMove)
        document.removeEventListener('pointerup', this.onResizePointerEnd)
        document.removeEventListener('pointercancel', this.onResizePointerEnd)
        this.resizeStart = null
    }

    get dirty (): boolean {
        return this.text !== this.initialText
    }

    onKeydown (event: KeyboardEvent): void {
        if (!(event.ctrlKey || event.metaKey) || !['s', 'Enter'].includes(event.key)) {
            return
        }
        event.preventDefault()
        event.stopPropagation()
        void this.save()
    }

    async save (allowSyntaxErrors = false): Promise<void> {
        if (this.saving || !this.dirty || !this.saveText) {
            return
        }
        if (!allowSyntaxErrors && this.syntaxFormat) {
            this.checkSyntax()
            if (this.syntaxIssues.length) {
                this.confirmingSyntaxSave = true
                return
            }
        }
        this.confirmingSyntaxSave = false
        this.saving = true
        this.saveFailed = false
        try {
            if (await this.saveText(this.text)) {
                this.closeWindow?.()
            } else {
                this.saveFailed = true
            }
        } catch {
            this.saveFailed = true
        } finally {
            this.saving = false
        }
    }

    cancel (): void {
        if (this.saving) {
            return
        }
        if (this.dirty) {
            this.confirmingDiscard = true
            return
        }
        this.closeWindow?.()
    }

    keepEditing (): void {
        this.confirmingDiscard = false
        this.confirmingSyntaxSave = false
    }

    /** 在错误提示后按用户明确选择保存无效内容。 */
    saveWithSyntaxErrors (): void {
        void this.save(true)
    }

    continueEditing (): void {
        this.confirmingSyntaxSave = false
    }

    discardChanges (): void {
        if (!this.saving) {
            this.closeWindow?.()
        }
    }
}
