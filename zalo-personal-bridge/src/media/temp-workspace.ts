import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export class TempWorkspace {
  private tempDir: string | null = null;

  async create(): Promise<string> {
    const baseDir = os.tmpdir();
    this.tempDir = await fs.mkdtemp(path.join(baseDir, 'zalo_media_'));
    return this.tempDir;
  }

  getPath(filename: string): string {
    if (!this.tempDir) {
      throw new Error('Workspace has not been created');
    }
    // Sanitize filename
    const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    return path.join(this.tempDir, safeName);
  }

  async cleanup(): Promise<void> {
    if (this.tempDir) {
      try {
        await fs.rm(this.tempDir, { recursive: true, force: true });
      } catch {}
      this.tempDir = null;
    }
  }
}
