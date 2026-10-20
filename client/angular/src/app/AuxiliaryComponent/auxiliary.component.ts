import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { InputTextModule } from "primeng/inputtext";
import { FloatLabelModule } from "primeng/floatlabel";
import { SelectModule } from "primeng/select";
import { ElectronService, Status, StatusTypes } from "../services/electron.service";
import { ToggleSwitchChangeEvent, ToggleSwitchModule } from "primeng/toggleswitch";
import { TagModule } from "primeng/tag";
import { LocalstorageService } from "../services/localstorage.service";
import { TraybConfig, migrateIngest } from "../trayb.config";
import { ButtonModule } from "primeng/button";
import { TitleCasePipe } from "@angular/common";
import { ToastModule } from "primeng/toast";
import { MessageService } from "primeng/api";
import { OptionsComponent } from "../options/options.component";

@Component({
  selector: "app-auxiliary",
  imports: [
    InputTextModule,
    FormsModule,
    FloatLabelModule,
    SelectModule,
    ToggleSwitchModule,
    TagModule,
    ButtonModule,
    TitleCasePipe,
    ToastModule,
    OptionsComponent,
  ],
  templateUrl: "./auxiliary.component.html",
  styleUrl: "./auxiliary.component.css",
})
export class AuxiliaryComponent implements OnInit {
  protected spectraStatus: Status = { message: "Initializing", statusType: StatusTypes.NEUTRAL };
  protected darkModeEnabled: boolean = false;

  constructor(
    protected electron: ElectronService,
    protected localStorageService: LocalstorageService,
    protected changeDetectorRef: ChangeDetectorRef,
    protected messageService: MessageService,
  ) {
    const loadedDarkModeEnabled = this.localStorageService.getItem<boolean>("darkMode");
    if (loadedDarkModeEnabled !== null) {
      this.darkModeEnabled = loadedDarkModeEnabled;
    } else {
      this.darkModeEnabled = true;
    }
    if (this.darkModeEnabled) {
      const element = document.querySelector("html");
      element!.classList.add("dark");
    }

    this.ingestServerIp = migrateIngest(
      this.localStorageService.getItem<string>("auxIngestServerIp"),
    );

    const minimizedToTraySettingLoaded = this.localStorageService.getItem<boolean>(
      "auxMinimizedToTraySetting",
    );
    if (minimizedToTraySettingLoaded !== null) {
      this.minimizedToTraySetting = minimizedToTraySettingLoaded;
    } else {
      this.minimizedToTraySetting = true;
    }
  }

  ngOnInit(): void {
    this.electron.spectraStatusMessage.subscribe((status: Status) => {
      this.spectraStatus = status;
      this.changeDetectorRef.detectChanges();
    });

    this.electron.fireConnect.subscribe(() => {
      this.connect();
    });

    this.electron.playernameMessage.subscribe((name: string) => {
      this.playername = name;
      this.changeDetectorRef.detectChanges();
    });

    this.electron.inputAllowedMessage.subscribe((value: boolean) => {
      this.editable = value;
      this.changeDetectorRef.detectChanges();
    });
  }

  protected ingestServerOptions: string[] = [TraybConfig.ingestServer];
  protected ingestServerIp: string | undefined = TraybConfig.ingestServer;
  protected playername: string = "";
  protected minimizedToTraySetting: boolean = true;

  protected editable: boolean = true;

  protected connect() {
    if (!this.ingestServerIp) {
      this.messageService.add({
        closable: true,
        sticky: true,
        severity: "error",
        summary: "Connection Error",
        detail: "No server ip selected/entered",
      });
      this.localStorageService.setItem("auxIngestServerIp", this.ingestServerIp);
      return;
    }

    const ingestIp = migrateIngest(this.ingestServerIp);
    this.electron.processAuxInputs(ingestIp, this.playername);

    this.localStorageService.setItem("auxIngestServerIp", this.ingestServerIp);
  }

  protected toggleDarkMode() {
    const element = document.querySelector("html");
    element!.classList.toggle("dark");
    this.darkModeEnabled = !this.darkModeEnabled;
    this.localStorageService.setItem("darkMode", this.darkModeEnabled);
  }

  protected toggleTraySetting(event: ToggleSwitchChangeEvent) {
    this.localStorageService.setItem("auxMinimizedToTraySetting", event.checked);
    this.electron.setTraySetting(event.checked);
  }
}
