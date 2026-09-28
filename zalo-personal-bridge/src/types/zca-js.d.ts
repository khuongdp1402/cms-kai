declare module 'zca-js' {
  export class Zalo {
    constructor(options?: any);
    login(credentials: {
      cookie: any;
      imei: string;
      userAgent?: string;
      language?: string;
    }): Promise<any>;
    loginQR(
      options?: {
        userAgent?: string;
        language?: string;
        qrPath?: string;
      },
      callback?: (event: any) => Promise<void> | void
    ): Promise<any>;
  }

  export enum ThreadType {
    User = 0,
    Group = 1,
  }

  export enum MessageType {
    DirectMessage = 0,
    GroupMessage = 1,
  }
}
