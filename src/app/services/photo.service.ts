import { Injectable } from '@angular/core';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular';

export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  private readonly PHOTO_STORAGE = 'photos' as const;

  public get photos(): UserPhoto[] {
    return this._photos;
  }

  private _photos: UserPhoto[] = [];
  constructor(private platform: Platform) {}

  public async addToGallery() {
    // take a photo
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100,
    });

    // this._photos.unshift({
    //   filepath: 'soon...',
    //   webviewPath: capturedPhoto.webPath,
    // });

    const savedImageFile = await this.savePicture(capturedPhoto);
    if (!savedImageFile) return;
    this._photos.unshift(savedImageFile);

    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });
  }

  public async loadSaved() {
    // retrieved cached photo array from data
    const photoList = await Preferences.get({ key: this.PHOTO_STORAGE });
    this._photos = JSON.parse(photoList.value ?? '') || [];

    // easiest way to detect when running on the web:
    // "when the platform is NOT hybried, do this"
    if (!this.platform.is('hybrid')) {
      // display the photo by reading into base64 format
      for (let photo of this.photos) {
        // read each saved photo's data from the file system
        const readFile = await Filesystem.readFile({
          path: photo.filepath,
          directory: Directory.Data,
        });

        // web platform only: load the photo as base64 data
        photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
      }
    }
  }

  private async savePicture(photo: Photo): Promise<UserPhoto | undefined> {
    // convert photo to base64 format, required by filesystem api to save
    const base64Data = await this.readAsBase64(photo);
    if (!base64Data) return void 0;

    // write the file to the data directory
    const path = new Date().getTime() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path,
      data: base64Data,
      directory: Directory.Data,
    });

    // display the new image by rewriting the 'file://' path to HTTP
    // details: https://ionicframework.com/docs/building/webview#file-protocol

    // or

    // use webpath to display the new image instead of base 64 since it's
    // already loaded into memory

    return this.platform.is('hybrid')
      ? {
          filepath: savedFile.uri,
          webviewPath: Capacitor.convertFileSrc(savedFile.uri),
        }
      : { filepath: path, webviewPath: photo.webPath };
  }

  private async readAsBase64(photo: Photo): Promise<string | undefined> {
    if (!photo.path || !photo.webPath) return void 0;

    // "jubrid" will detect Cordova or Capacitor
    if (this.platform.is('hybrid')) {
      // read the file into base 64 format
      const file = await Filesystem.readFile({ path: photo.path });

      return file.data;
    }

    // Fetch the photo, read as a blob, then convert to base64 format
    const response = await fetch(photo.webPath);
    const blob = await response.blob();

    return (await this.convertBlobToBase64(blob)) as string;
  }

  private convertBlobToBase64 = (blob: Blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
}
