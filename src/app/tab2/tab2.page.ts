import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';
import { PhotoService, UserPhoto } from '../services/photo.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [IonicModule, ExploreContainerComponent, CommonModule],
})
export class Tab2Page implements OnInit {
  public get photos(): UserPhoto[] {
    return this.photoService.photos;
  }

  constructor(private photoService: PhotoService) {}

  public addToPhotoGallery() {
    this.photoService.addToGallery();
  }

  async ngOnInit(): Promise<void> {
    await this.photoService.loadSaved();
  }
}
