export namespace application {
	
	export class DiagnosticsInfo {
	    appName: string;
	    appVersion: string;
	    goVersion: string;
	    os: string;
	    arch: string;
	    startedAt: string;
	    logDirectory: string;
	    logFile: string;
	
	    static createFrom(source: any = {}) {
	        return new DiagnosticsInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.appName = source["appName"];
	        this.appVersion = source["appVersion"];
	        this.goVersion = source["goVersion"];
	        this.os = source["os"];
	        this.arch = source["arch"];
	        this.startedAt = source["startedAt"];
	        this.logDirectory = source["logDirectory"];
	        this.logFile = source["logFile"];
	    }
	}
	export class LifecycleStatus {
	    startedAt: string;
	    ready: boolean;
	    secondInstanceCount: number;
	
	    static createFrom(source: any = {}) {
	        return new LifecycleStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startedAt = source["startedAt"];
	        this.ready = source["ready"];
	        this.secondInstanceCount = source["secondInstanceCount"];
	    }
	}
	export class MessageNotificationRequest {
	    id?: string;
	    sender: string;
	    content: string;
	    conversationId?: string;
	
	    static createFrom(source: any = {}) {
	        return new MessageNotificationRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.sender = source["sender"];
	        this.content = source["content"];
	        this.conversationId = source["conversationId"];
	    }
	}
	export class SystemNotificationStatus {
	    available: boolean;
	    authorized: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SystemNotificationStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.available = source["available"];
	        this.authorized = source["authorized"];
	    }
	}

}

export namespace nativekit {
	
	export class FileFilter {
	    displayName: string;
	    pattern: string;
	
	    static createFrom(source: any = {}) {
	        return new FileFilter(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.displayName = source["displayName"];
	        this.pattern = source["pattern"];
	    }
	}
	export class MessageDialogOptions {
	    type: string;
	    title: string;
	    message: string;
	    buttons?: string[];
	    defaultButton?: string;
	    cancelButton?: string;
	
	    static createFrom(source: any = {}) {
	        return new MessageDialogOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.title = source["title"];
	        this.message = source["message"];
	        this.buttons = source["buttons"];
	        this.defaultButton = source["defaultButton"];
	        this.cancelButton = source["cancelButton"];
	    }
	}
	export class OpenFilesOptions {
	    title: string;
	    defaultDirectory?: string;
	    filters?: FileFilter[];
	    multiple: boolean;
	
	    static createFrom(source: any = {}) {
	        return new OpenFilesOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.title = source["title"];
	        this.defaultDirectory = source["defaultDirectory"];
	        this.filters = this.convertValues(source["filters"], FileFilter);
	        this.multiple = source["multiple"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SaveFileOptions {
	    title: string;
	    defaultDirectory?: string;
	    defaultFilename?: string;
	    filters?: FileFilter[];
	
	    static createFrom(source: any = {}) {
	        return new SaveFileOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.title = source["title"];
	        this.defaultDirectory = source["defaultDirectory"];
	        this.defaultFilename = source["defaultFilename"];
	        this.filters = this.convertValues(source["filters"], FileFilter);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Screen {
	    isCurrent: boolean;
	    isPrimary: boolean;
	    width: number;
	    height: number;
	    physicalWidth: number;
	    physicalHeight: number;
	
	    static createFrom(source: any = {}) {
	        return new Screen(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.isCurrent = source["isCurrent"];
	        this.isPrimary = source["isPrimary"];
	        this.width = source["width"];
	        this.height = source["height"];
	        this.physicalWidth = source["physicalWidth"];
	        this.physicalHeight = source["physicalHeight"];
	    }
	}

}

export namespace settings {
	
	export class WindowBounds {
	    x: number;
	    y: number;
	    width: number;
	    height: number;
	    maximised: boolean;
	
	    static createFrom(source: any = {}) {
	        return new WindowBounds(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.x = source["x"];
	        this.y = source["y"];
	        this.width = source["width"];
	        this.height = source["height"];
	        this.maximised = source["maximised"];
	    }
	}
	export class Window {
	    closeBehavior: string;
	    alwaysOnTop: boolean;
	    rememberBounds: boolean;
	    bounds?: WindowBounds;
	
	    static createFrom(source: any = {}) {
	        return new Window(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.closeBehavior = source["closeBehavior"];
	        this.alwaysOnTop = source["alwaysOnTop"];
	        this.rememberBounds = source["rememberBounds"];
	        this.bounds = this.convertValues(source["bounds"], WindowBounds);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Notifications {
	    enabled: boolean;
	    showPreview: boolean;
	    doNotDisturb: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Notifications(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled = source["enabled"];
	        this.showPreview = source["showPreview"];
	        this.doNotDisturb = source["doNotDisturb"];
	    }
	}
	export class Appearance {
	    themeMode: string;
	    accent: string;
	    density: string;
	    fontScale: number;
	
	    static createFrom(source: any = {}) {
	        return new Appearance(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.themeMode = source["themeMode"];
	        this.accent = source["accent"];
	        this.density = source["density"];
	        this.fontScale = source["fontScale"];
	    }
	}
	export class AppSettings {
	    version: number;
	    appearance: Appearance;
	    notifications: Notifications;
	    window: Window;
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.appearance = this.convertValues(source["appearance"], Appearance);
	        this.notifications = this.convertValues(source["notifications"], Notifications);
	        this.window = this.convertValues(source["window"], Window);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	

}

