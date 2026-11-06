export type GoogleDriveType = 'document' | 'presentation' | 'spreadsheet' | 'folder' | 'file';

export interface GoogleDriveInfo {
  isValid: boolean;
  fileId?: string;
  driveType: GoogleDriveType;
  embedUrl?: string;
  label: string;
  cleanUrl: string;
}

/**
 * Parses a Google Drive or Google Docs / Sheets / Slides link.
 * Extracts the file ID, resource type, embeddable preview URL, and human-friendly label.
 */
export function parseGoogleDriveUrl(rawUrl: string): GoogleDriveInfo {
  const cleanUrl = (rawUrl || '').trim();
  if (!cleanUrl) {
    return {
      isValid: false,
      driveType: 'file',
      label: 'Google Drive File',
      cleanUrl: '',
    };
  }

  try {
    const parsed = new URL(cleanUrl);
    const host = parsed.hostname.toLowerCase();
    const isGoogleHost =
      host === 'drive.google.com' ||
      host === 'docs.google.com' ||
      host.endsWith('.google.com');

    if (!isGoogleHost) {
      return {
        isValid: false,
        driveType: 'file',
        label: 'External Link',
        cleanUrl,
      };
    }

    const pathname = parsed.pathname;

    // Google Docs: /document/d/{fileId}/...
    if (pathname.includes('/document/d/')) {
      const match = pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
      const fileId = match ? match[1] : undefined;
      return {
        isValid: true,
        fileId,
        driveType: 'document',
        embedUrl: fileId ? `https://docs.google.com/document/d/${fileId}/preview` : undefined,
        label: 'Google Doc',
        cleanUrl,
      };
    }

    // Google Slides: /presentation/d/{fileId}/...
    if (pathname.includes('/presentation/d/')) {
      const match = pathname.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
      const fileId = match ? match[1] : undefined;
      return {
        isValid: true,
        fileId,
        driveType: 'presentation',
        embedUrl: fileId ? `https://docs.google.com/presentation/d/${fileId}/preview` : undefined,
        label: 'Google Slides',
        cleanUrl,
      };
    }

    // Google Sheets: /spreadsheets/d/{fileId}/...
    if (pathname.includes('/spreadsheets/d/')) {
      const match = pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      const fileId = match ? match[1] : undefined;
      return {
        isValid: true,
        fileId,
        driveType: 'spreadsheet',
        embedUrl: fileId ? `https://docs.google.com/spreadsheets/d/${fileId}/preview` : undefined,
        label: 'Google Sheet',
        cleanUrl,
      };
    }

    // Google Drive Folders: /drive/folders/{folderId}
    if (pathname.includes('/drive/folders/')) {
      const match = pathname.match(/\/drive\/folders\/([a-zA-Z0-9_-]+)/);
      const fileId = match ? match[1] : undefined;
      return {
        isValid: true,
        fileId,
        driveType: 'folder',
        label: 'Google Drive Folder',
        cleanUrl,
      };
    }

    // Google Drive File: /file/d/{fileId}/...
    if (pathname.includes('/file/d/')) {
      const match = pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      const fileId = match ? match[1] : undefined;
      return {
        isValid: true,
        fileId,
        driveType: 'file',
        embedUrl: fileId ? `https://drive.google.com/file/d/${fileId}/preview` : undefined,
        label: 'Google Drive File',
        cleanUrl,
      };
    }

    // Google Drive open with query param: ?id={fileId}
    if (parsed.searchParams.has('id')) {
      const fileId = parsed.searchParams.get('id') || undefined;
      return {
        isValid: true,
        fileId,
        driveType: 'file',
        embedUrl: fileId ? `https://drive.google.com/file/d/${fileId}/preview` : undefined,
        label: 'Google Drive File',
        cleanUrl,
      };
    }

    // Generic Google Drive URL
    if (host === 'drive.google.com' || host === 'docs.google.com') {
      return {
        isValid: true,
        driveType: 'file',
        label: 'Google Drive Item',
        cleanUrl,
      };
    }

    return {
      isValid: false,
      driveType: 'file',
      label: 'Invalid Google Drive Link',
      cleanUrl,
    };
  } catch {
    return {
      isValid: false,
      driveType: 'file',
      label: 'Invalid Link',
      cleanUrl,
    };
  }
}

/**
 * Returns user-facing badge colors and icon emoji for a given Google Drive resource type.
 */
export function getGoogleDriveBadge(driveType?: GoogleDriveType) {
  switch (driveType) {
    case 'document':
      return {
        icon: '📄',
        name: 'Google Doc',
        accentColor: '#1a73e8',
        bg: '#e8f0fe',
        borderColor: '#bad3fc',
      };
    case 'presentation':
      return {
        icon: '📊',
        name: 'Google Slides',
        accentColor: '#ea8600',
        bg: '#fef7e0',
        borderColor: '#fde293',
      };
    case 'spreadsheet':
      return {
        icon: '📈',
        name: 'Google Sheet',
        accentColor: '#188038',
        bg: '#e6f4ea',
        borderColor: '#a8dab5',
      };
    case 'folder':
      return {
        icon: '📁',
        name: 'Google Drive Folder',
        accentColor: '#5f6368',
        bg: '#f1f3f4',
        borderColor: '#dadce0',
      };
    case 'file':
    default:
      return {
        icon: '📎',
        name: 'Google Drive File',
        accentColor: '#1967d2',
        bg: '#e8f0fe',
        borderColor: '#bad3fc',
      };
  }
}
