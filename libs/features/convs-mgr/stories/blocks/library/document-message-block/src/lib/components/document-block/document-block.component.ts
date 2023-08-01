import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { SubSink } from 'subsink';
import { BrowserJsPlumbInstance } from '@jsplumb/browser-ui';

import { FileStorageService } from '@app/state/file';
import { DocumentMessageBlock } from '@app/model/convs-mgr/stories/blocks/messaging';

@Component({
  selector: 'app-document-block',
  templateUrl: './document-block.component.html',
  styleUrls: ['./document-block.component.scss'],
})
export class DocumentBlockComponent implements OnInit, OnDestroy  {

  @Input() id: string;
  @Input() block: DocumentMessageBlock;
  @Input() documentMessageForm: FormGroup;
  @Input() jsPlumb: BrowserJsPlumbInstance;

  file: File;
  docInputId: string;
  isDocLoading = false;
  byPassedLimits: any[] = [];

  private _sBs = new SubSink();

  constructor(private _docUploadService: FileStorageService){ }

  ngOnInit(): void 
  {
    this.docInputId = `docs-${this.id}`;
  }

  async processDocs(event: any) {   
    const allowedFileTypes = ['application/pdf'];
    this.file = event.target.files[0];

    if (!allowedFileTypes.includes(event.target.files[0].type)) {
      this._docUploadService.openErrorModal("Invalid File Type", "Please select a .pdf only.");
      return;
    };

    // Check if file bypasses size limit.
    const fileSizeInKB = this.file.size / 1024;
    this.byPassedLimits = this._checkSizeLimit(fileSizeInKB, 'sticker');

    if (this.file && !this.byPassedLimits.length) {
      this.isDocLoading = true;

      //Step 1 - Create the file path that will be in firebase storage
      const docFilePath = `docs/${this.file.name}_${new Date().getTime()}`;

      //Step 2 - Upload file to firestore
      const response = await this._docUploadService.uploadSingleFile(this.file, docFilePath);

      //Step 3 - PatchValue to Block
      this._sBs.sink = response.subscribe(url => this._autofillDocUrl(url));
    }
  }

  private _checkSizeLimit(size:number, type:string) {
    return this._docUploadService.checkFileSizeLimits(size, type)
  }

  private _autofillDocUrl(url: any) {
    this.documentMessageForm.patchValue({ fileSrc: url });
    this.isDocLoading = false;
  }

  ngOnDestroy(): void {
    this._sBs.unsubscribe();
  }
}