import test from 'node:test';
import assert from 'node:assert';
import { parseGoogleDriveUrl, getGoogleDriveBadge } from '../lib/google-drive.ts';
import { GoogleDriveAttachmentSchema, MaterialPayloadSchema } from '../lib/validation.ts';
import { upsertStoredRecord, getStoredRecords, deleteStoredRecord } from '../lib/storage.ts';

test('parseGoogleDriveUrl accurately identifies and extracts Google Docs, Slides, Sheets, Folders, and Files', () => {
  // 1. Google Doc
  const docResult = parseGoogleDriveUrl(
    'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing'
  );
  assert.strictEqual(docResult.isValid, true);
  assert.strictEqual(docResult.driveType, 'document');
  assert.strictEqual(docResult.fileId, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
  assert.strictEqual(
    docResult.embedUrl,
    'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview'
  );
  assert.strictEqual(docResult.label, 'Google Doc');

  // 2. Google Slides
  const slideResult = parseGoogleDriveUrl(
    'https://docs.google.com/presentation/d/1qpyC9pU9eT8c4SlidesId_99/edit#slide=id.p'
  );
  assert.strictEqual(slideResult.isValid, true);
  assert.strictEqual(slideResult.driveType, 'presentation');
  assert.strictEqual(slideResult.fileId, '1qpyC9pU9eT8c4SlidesId_99');
  assert.strictEqual(
    slideResult.embedUrl,
    'https://docs.google.com/presentation/d/1qpyC9pU9eT8c4SlidesId_99/preview'
  );
  assert.strictEqual(slideResult.label, 'Google Slides');

  // 3. Google Sheets
  const sheetResult = parseGoogleDriveUrl(
    'https://docs.google.com/spreadsheets/d/1_jKSheetsId123/edit'
  );
  assert.strictEqual(sheetResult.isValid, true);
  assert.strictEqual(sheetResult.driveType, 'spreadsheet');
  assert.strictEqual(sheetResult.fileId, '1_jKSheetsId123');
  assert.strictEqual(
    sheetResult.embedUrl,
    'https://docs.google.com/spreadsheets/d/1_jKSheetsId123/preview'
  );
  assert.strictEqual(sheetResult.label, 'Google Sheet');

  // 4. Google Drive Folder
  const folderResult = parseGoogleDriveUrl(
    'https://drive.google.com/drive/folders/1FolderId_456ABC'
  );
  assert.strictEqual(folderResult.isValid, true);
  assert.strictEqual(folderResult.driveType, 'folder');
  assert.strictEqual(folderResult.fileId, '1FolderId_456ABC');
  assert.strictEqual(folderResult.embedUrl, undefined);
  assert.strictEqual(folderResult.label, 'Google Drive Folder');

  // 5. Google Drive File / PDF
  const fileResult = parseGoogleDriveUrl(
    'https://drive.google.com/file/d/1PdfDriveId_789XYZ/view?usp=sharing'
  );
  assert.strictEqual(fileResult.isValid, true);
  assert.strictEqual(fileResult.driveType, 'file');
  assert.strictEqual(fileResult.fileId, '1PdfDriveId_789XYZ');
  assert.strictEqual(
    fileResult.embedUrl,
    'https://drive.google.com/file/d/1PdfDriveId_789XYZ/preview'
  );

  // 6. Open link with ID
  const openResult = parseGoogleDriveUrl(
    'https://drive.google.com/open?id=1OpenLinkFileId'
  );
  assert.strictEqual(openResult.isValid, true);
  assert.strictEqual(openResult.fileId, '1OpenLinkFileId');

  // 7. Non-Google link
  const nonGoogle = parseGoogleDriveUrl('https://example.com/file.pdf');
  assert.strictEqual(nonGoogle.isValid, false);

  // 8. Empty input
  const emptyResult = parseGoogleDriveUrl('');
  assert.strictEqual(emptyResult.isValid, false);
});

test('getGoogleDriveBadge provides distinctive visual branding', () => {
  const docBadge = getGoogleDriveBadge('document');
  assert.strictEqual(docBadge.icon, '📄');
  assert.strictEqual(docBadge.name, 'Google Doc');

  const slidesBadge = getGoogleDriveBadge('presentation');
  assert.strictEqual(slidesBadge.icon, '📊');
  assert.strictEqual(slidesBadge.name, 'Google Slides');

  const sheetsBadge = getGoogleDriveBadge('spreadsheet');
  assert.strictEqual(sheetsBadge.icon, '📈');

  const fileBadge = getGoogleDriveBadge('file');
  assert.strictEqual(fileBadge.icon, '📎');
});

test('MaterialPayloadSchema validates materials with computer file, Google Drive, or both', () => {
  // Material with Google Drive attachment only
  const driveOnly = {
    id: 'mat-gdrive-1',
    kind: 'material',
    title: 'Adverbs and Connectors Slides',
    type: 'Grammar Guide',
    color: 'mint',
    icon: '📊',
    body: 'Review the transition words on slide 4 before drafting your essay.',
    googleDrive: {
      url: 'https://docs.google.com/presentation/d/12345/edit',
      name: 'Adverbs Slide Deck',
      fileId: '12345',
      driveType: 'presentation',
      embedUrl: 'https://docs.google.com/presentation/d/12345/preview',
    },
  };
  const parseResult1 = MaterialPayloadSchema.safeParse(driveOnly);
  assert.ok(parseResult1.success, 'Material with Google Drive should pass validation');

  // Material with BOTH computer file and Google Drive attachment
  const bothAttachments = {
    id: 'mat-both-1',
    kind: 'material',
    title: 'Competition Exemplar Essays',
    type: 'Study Guide',
    color: 'lavender',
    icon: '🏆',
    body: 'Download the rubric and open the shared Google Doc exemplar.',
    file: {
      key: 'files/rubric.pdf',
      name: 'competition-rubric.pdf',
      size: 104200,
    },
    googleDrive: {
      url: 'https://docs.google.com/document/d/98765/edit',
      name: 'Exemplar Essay Google Doc',
      fileId: '98765',
      driveType: 'document',
      embedUrl: 'https://docs.google.com/document/d/98765/preview',
    },
  };
  const parseResult2 = MaterialPayloadSchema.safeParse(bothAttachments);
  assert.ok(parseResult2.success, 'Material with both attachments should pass validation');
});

test('Material with Google Drive attachment persists and is retrievable from storage', async () => {
  const materialWithDrive = {
    id: 'm-persisted-drive',
    kind: 'material',
    title: 'Persuasive Speech Templates',
    type: 'Templates',
    color: 'peach',
    icon: '🎤',
    body: 'Use this template to structure your arguments.',
    googleDrive: {
      url: 'https://docs.google.com/document/d/persist-doc-id/edit',
      name: 'Speech Outline Template',
      fileId: 'persist-doc-id',
      driveType: 'document' as const,
      embedUrl: 'https://docs.google.com/document/d/persist-doc-id/preview',
    },
  };

  await upsertStoredRecord(
    materialWithDrive.id,
    'local_seedy',
    materialWithDrive.kind,
    materialWithDrive as unknown as Record<string, unknown>
  );

  const records = await getStoredRecords('local_seedy');
  const found = records.find(
    (r) => r.id === 'local_seedy:m-persisted-drive' || r.id === 'm-persisted-drive'
  );
  assert.ok(found, 'Persisted material with Google Drive should be found');
  assert.strictEqual(found.title, 'Persuasive Speech Templates');
  const gdrive = found.googleDrive as { name?: string; fileId?: string; url?: string };
  assert.ok(gdrive, 'googleDrive object must be retained');
  assert.strictEqual(gdrive.name, 'Speech Outline Template');
  assert.strictEqual(gdrive.fileId, 'persist-doc-id');

  // Clean up
  await deleteStoredRecord('m-persisted-drive', 'local_seedy');
});
