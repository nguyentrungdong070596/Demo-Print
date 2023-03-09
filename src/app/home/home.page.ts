import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  BleClient,
  dataViewToText,
  numbersToDataView,
  ScanResult,
} from '@capacitor-community/bluetooth-le';
import { Http } from '@capacitor-community/http';
// import { Wifi } from '@capacitor-community/wifi';
import { ToastController } from '@ionic/angular';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  bluetoothScanResults: ScanResult[] = [];
  bluetoothIsScanning = false;

  bluetoothConnectedDevice?: ScanResult;


  /**
   * @goProControlAndQueryServiceUUID {string} - Should be FEA6.
   * https://gopro.github.io/OpenGoPro/ble#services-and-characteristics
   * and 128-bit version will be 0000fea6-0000-1000-8000-00805f9b34fb
   * passing FEA6 (16-bit version) does not work
   * you can read more here https://github.com/gopro/OpenGoPro/discussions/41#discussion-3530421
   */
  //
  readonly goProControlAndQueryServiceUUID =
    '0000fea6-0000-1000-8000-00805f9b34fb'.toUpperCase();

  readonly goProWifiAccessPointServiceUUID =
    `b5f90001-aa8d-11e3-9046-0002a5d5c51b`.toUpperCase();

  readonly goProCommandReqCharacteristicsUUID =
    'b5f90072-aa8d-11e3-9046-0002a5d5c51b'.toUpperCase();

  readonly goProWifiSSIDCharacteristicUUID =
    `b5f90002-aa8d-11e3-9046-0002a5d5c51b`.toUpperCase();

  readonly goProWifiPASSCharacteristicUUID =
    `b5f90003-aa8d-11e3-9046-0002a5d5c51b`.toUpperCase();

  readonly shutdownCommand = [0x01, 0x05];

  readonly shutterCommand = [0x03, 0x01, 0x01, 0x01];

  readonly enableGoProWiFiCommand = [0x03, 0x17, 0x01, 0x01];

  constructor(public toastController: ToastController, public router: Router) { }

  ngOnInit(): void { }

  // Giu lai
  async scanForBluetoothDevices() {
    try {
      await BleClient.initialize();

      this.bluetoothScanResults = [];
      this.bluetoothIsScanning = true;

      // passing goProControlAndQueryServiceUUID will show only GoPro devices
      // read more here https://github.com/gopro/OpenGoPro/discussions/41#discussion-3530421
      // but if you pass empty array to services it will show all nearby bluetooth devices
      await BleClient.requestLEScan(
        { services: [this.goProControlAndQueryServiceUUID] },
        this.onBluetoothDeviceFound.bind(this)
      );

      const stopScanAfterMilliSeconds = 3500;
      setTimeout(async () => {
        await BleClient.stopLEScan();
        this.bluetoothIsScanning = false;
        console.log('stopped scanning');
      }, stopScanAfterMilliSeconds);
    } catch (error) {
      this.bluetoothIsScanning = false;
      console.error('scanForBluetoothDevices', error);
    }
  }

  onBluetoothDeviceFound(result: any) {
    console.log('received new scan result', result);
    this.bluetoothScanResults.push(result);
  }
// giu lai
  async connectToBluetoothDevice(scanResult: ScanResult) {
    const device = scanResult.device;

    try {
      await BleClient.connect(
        device.deviceId,
        this.onBluetooDeviceDisconnected.bind(this)
      );

      this.bluetoothConnectedDevice = scanResult;
      await this.triggerBluetoothPairing();

      const deviceName = device.name ?? device.deviceId;
      this.presentToast(`connected to device ${deviceName}`);
    } catch (error) {
      console.error('connectToDevice', error);
      this.presentToast(JSON.stringify(error));
    }
  }

  async triggerBluetoothPairing() {
    await this.sendBluetoothWriteCommand(this.enableGoProWiFiCommand);
  }
//giu lai
  async disconnectFromBluetoothDevice(scanResult: ScanResult) {
    const device = scanResult.device;
    try {
      await BleClient.disconnect(scanResult.device.deviceId);
      const deviceName = device.name ?? device.deviceId;
      alert(`disconnected from device ${deviceName}`);
    } catch (error) {
      console.error('disconnectFromDevice', error);
    }
  }

  onBluetooDeviceDisconnected(disconnectedDeviceId: string) {
    alert(`Diconnected ${disconnectedDeviceId}`);
    this.bluetoothConnectedDevice = undefined;
  }

  async sendBluetoothWriteCommand(command: number[]) {
    if (!this.bluetoothConnectedDevice) {
      this.presentToast('Bluetooth device not connected');
      return;
    }

    try {
      await BleClient.write(
        this.bluetoothConnectedDevice.device.deviceId,
        this.goProControlAndQueryServiceUUID,
        this.goProCommandReqCharacteristicsUUID,
        numbersToDataView(command)
      );
      this.presentToast('command sent');
    } catch (error) {
      console.log(`error: ${JSON.stringify(error)}`);
      this.presentToast(JSON.stringify(error));
    }
  }



  sendWiFiReadCommand() {
    // TODO: && check if wifi was connected
    if (!this.bluetoothConnectedDevice) {
      return;
    }
    throw new Error('Method not implemented.');
  }

  sendWifiWriteCommand() {
    if (!this.bluetoothConnectedDevice) {
      return;
    }
    throw new Error('Method not implemented.');
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1700,
    });
    toast.present();
  }
}
