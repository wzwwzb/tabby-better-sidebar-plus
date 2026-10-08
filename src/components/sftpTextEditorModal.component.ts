import './sftpTextEditorModal.component.scss'
import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core'
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { SidebarPlusI18nService } from '../i18n'
import { ConfirmModalComponent } from './confirmModal.component'

/** 在 Tabby 内编辑一个远程 UTF-8 文本文件。 */
@Component({
    selector: 'sidebar-plus-sftp-text-editor-modal',
    template: require('./sftpTextEditorModal.component.pug'),
})
export class SftpTextEditorModalComponent implements AfterViewInit {
    @Input() fileName = ''
    @Input() remotePath = ''
    @Input() initialText = ''
    @Input() text = ''
    @Input() saveText: ((text: string) => Promise<boolean>)|null = null

    @ViewChild('field') field: ElementRef<HTMLTextAreaElement>

    saving = false
    saveFailed = false

    constructor (
        private activeModal: NgbActiveModal,
        private ngbModal: NgbModal,
        private i18n: SidebarPlusI18nService,
    ) { }

    /** 动画完成后聚焦文本区，便于立即编辑。 */
    ngAfterViewInit (): void {
        setTimeout(() => this.field?.nativeElement.focus())
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

    async save (): Promise<void> {
        if (this.saving || !this.dirty || !this.saveText) {
            return
        }
        this.saving = true
        this.saveFailed = false
        try {
            if (await this.saveText(this.text)) {
                this.activeModal.close(this.text)
            } else {
                this.saveFailed = true
            }
        } catch {
            this.saveFailed = true
        } finally {
            this.saving = false
        }
    }

    async cancel (): Promise<void> {
        if (this.saving) {
            return
        }
        if (this.dirty && !await this.confirmDiscard()) {
            return
        }
        this.activeModal.dismiss()
    }

    private async confirmDiscard (): Promise<boolean> {
        const modal = this.ngbModal.open(ConfirmModalComponent)
        modal.componentInstance.message = this.i18n.t('Discard unsaved changes to {name}?', { name: this.fileName })
        modal.componentInstance.confirmLabel = this.i18n.t('Discard changes')
        modal.componentInstance.danger = false
        return await modal.result.catch(() => false)
    }
}
