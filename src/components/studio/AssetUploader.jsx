import { useMemo, useState } from 'react';
import { createBlankContentBlock, createBlankResource } from '../../lib/contentLibrary.js';
import { contentTypeForFile, studioAssetLimit, uploadStudioAsset } from '../../lib/studioApi.js';

const ACCEPTED = '.png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.ppt,.pptx,.mp3,.ogg,.wav,.mp4,.webm';

const resourceLabel = (file) => {
  const extension = String(file?.name || '').split('.').pop()?.toUpperCase();
  return extension || 'FILE';
};

export function AssetUploader({ subject, password, onAddBlock, updateSubject, onError, onNotice }) {
  const [file, setFile] = useState(null);
  const [chapterId, setChapterId] = useState(subject.modules?.[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const type = useMemo(() => file ? contentTypeForFile(file) : '', [file]);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const response = await uploadStudioAsset(password, file);
      const asset = response.asset;
      if (type.startsWith('image/')) {
        const block = createBlankContentBlock('image');
        block.title = file.name.replace(/\.[^.]+$/, '');
        block.chapterId = chapterId;
        block.section = subject.modules.find((chapter) => chapter.id === chapterId)?.section || 'course';
        block.content.url = asset.url;
        block.content.alt = block.title;
        block.content.assetPath = asset.path;
        onAddBlock(block);
      } else {
        const resource = createBlankResource();
        resource.title = file.name.replace(/\.[^.]+$/, '');
        resource.type = resourceLabel(file);
        resource.resourceType = resource.type.toLowerCase();
        resource.url = asset.url;
        resource.chapterId = chapterId;
        resource.description = `${resource.type} material`;
        resource.metadata = { storagePath: asset.path, contentType: asset.contentType, size: asset.size };
        updateSubject({ resources: [...(subject.resources || []), resource] });
      }
      setFile(null);
      onNotice?.(`${file.name} was uploaded and added to ${subject.code}.`);
    } catch (error) {
      onError?.(error.message || 'The file could not be uploaded.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="asset-uploader">
    <div className="studio-section-heading"><div><span className="studio-kicker">Supabase asset library</span><h3>Add files and media</h3><p>Upload pictures directly into the document, or attach PDFs, Word documents, PowerPoint files, audio, and short videos as subject resources.</p></div></div>
    <div className="asset-uploader__grid">
      <label className="asset-dropzone"><input type="file" accept={ACCEPTED} onChange={(event) => setFile(event.target.files?.[0] || null)} /><span>＋</span><strong>{file ? file.name : 'Choose a material'}</strong><small>{file ? `${(file.size / 1_000_000).toFixed(2)} MB · ${resourceLabel(file)}` : 'Image, PDF, Word, PowerPoint, audio, or video · maximum 5.5 MB'}</small></label>
      <div className="asset-uploader__settings">
        <label className="studio-field"><span>Add to chapter</span><select value={chapterId} onChange={(event) => setChapterId(event.target.value)}><option value="">Subject-wide</option>{subject.modules.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.title}</option>)}</select></label>
        <div className="asset-file-summary"><span>Storage</span><strong>AG Study assets</strong><small>Public course file · protected administrator upload</small></div>
        {file && file.size > studioAssetLimit ? <p className="studio-inline-error">This file is larger than 5.5 MB.</p> : null}
        <button type="button" className="primary-button" disabled={!file || busy || file.size > studioAssetLimit} onClick={upload}>{busy ? 'Uploading…' : type.startsWith('image/') ? 'Upload and insert image' : 'Upload and attach file'}</button>
      </div>
    </div>
    <div className="asset-format-grid"><span><b>Images</b>Inserted into the live document</span><span><b>PDF</b>Opens as course material</span><span><b>Word</b>DOC and DOCX downloads</span><span><b>PowerPoint</b>PPT and PPTX downloads</span><span><b>Media</b>MP3, OGG, WAV, MP4, and WebM</span></div>
  </div>;
}
