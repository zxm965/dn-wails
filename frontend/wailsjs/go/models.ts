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

export namespace appupdate {
	
	export class Info {
	    currentVersion: string;
	    repository: string;
	    platform: string;
	    arch: string;
	    configured: boolean;
	    canInstall: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Info(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.currentVersion = source["currentVersion"];
	        this.repository = source["repository"];
	        this.platform = source["platform"];
	        this.arch = source["arch"];
	        this.configured = source["configured"];
	        this.canInstall = source["canInstall"];
	    }
	}
	export class Status {
	    currentVersion: string;
	    latestVersion: string;
	    updateAvailable: boolean;
	    releaseName: string;
	    releaseNotes: string;
	    releaseUrl: string;
	    publishedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Status(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.currentVersion = source["currentVersion"];
	        this.latestVersion = source["latestVersion"];
	        this.updateAvailable = source["updateAvailable"];
	        this.releaseName = source["releaseName"];
	        this.releaseNotes = source["releaseNotes"];
	        this.releaseUrl = source["releaseUrl"];
	        this.publishedAt = source["publishedAt"];
	    }
	}

}

export namespace dn {
	
	export class Profile {
	    id: number;
	    account: string;
	    name: string;
	    email: string;
	    role: number;
	    status: number;
	    avatar: string;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Profile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.account = source["account"];
	        this.name = source["name"];
	        this.email = source["email"];
	        this.role = source["role"];
	        this.status = source["status"];
	        this.avatar = source["avatar"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class AuthState {
	    authenticated: boolean;
	    user?: Profile;
	    expiresAt: string;
	
	    static createFrom(source: any = {}) {
	        return new AuthState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.authenticated = source["authenticated"];
	        this.user = this.convertValues(source["user"], Profile);
	        this.expiresAt = source["expiresAt"];
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
	export class ListMeta {
	    total: number;
	    totalPages: number;
	    page: number;
	    pageSize: number;
	
	    static createFrom(source: any = {}) {
	        return new ListMeta(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total = source["total"];
	        this.totalPages = source["totalPages"];
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	    }
	}
	export class LoginInput {
	    login: string;
	    password: string;
	
	    static createFrom(source: any = {}) {
	        return new LoginInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.login = source["login"];
	        this.password = source["password"];
	    }
	}
	export class OfficialMessageSyncResult {
	    skipped: boolean;
	    fetched: number;
	    published: number;
	    syncedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new OfficialMessageSyncResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.skipped = source["skipped"];
	        this.fetched = source["fetched"];
	        this.published = source["published"];
	        this.syncedAt = source["syncedAt"];
	    }
	}
	export class PasswordInput {
	    currentPassword: string;
	    newPassword: string;
	
	    static createFrom(source: any = {}) {
	        return new PasswordInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.currentPassword = source["currentPassword"];
	        this.newPassword = source["newPassword"];
	    }
	}
	
	export class ProfileInput {
	    name: string;
	    email: string;
	    avatar: string;
	
	    static createFrom(source: any = {}) {
	        return new ProfileInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.email = source["email"];
	        this.avatar = source["avatar"];
	    }
	}
	export class RegistrationInput {
	    account: string;
	    email: string;
	    password: string;
	
	    static createFrom(source: any = {}) {
	        return new RegistrationInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.account = source["account"];
	        this.email = source["email"];
	        this.password = source["password"];
	    }
	}
	export class RoleProfession {
	    id: number;
	    ownerId: number;
	    roleName: string;
	    profession: string;
	    priority: number;
	    remark: string;
	    sortOrder: number;
	    weeklyPlanCount: number;
	    createdAt: string;
	    updatedAt: string;
	    deletedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new RoleProfession(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.ownerId = source["ownerId"];
	        this.roleName = source["roleName"];
	        this.profession = source["profession"];
	        this.priority = source["priority"];
	        this.remark = source["remark"];
	        this.sortOrder = source["sortOrder"];
	        this.weeklyPlanCount = source["weeklyPlanCount"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	        this.deletedAt = source["deletedAt"];
	    }
	}
	export class RoleProfessionInput {
	    id: number;
	    roleName: string;
	    profession: string;
	    priority: number;
	    remark: string;
	    sortOrder: number;
	
	    static createFrom(source: any = {}) {
	        return new RoleProfessionInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.roleName = source["roleName"];
	        this.profession = source["profession"];
	        this.priority = source["priority"];
	        this.remark = source["remark"];
	        this.sortOrder = source["sortOrder"];
	    }
	}
	export class RoleProfessionList {
	    items: RoleProfession[];
	    meta: ListMeta;
	
	    static createFrom(source: any = {}) {
	        return new RoleProfessionList(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], RoleProfession);
	        this.meta = this.convertValues(source["meta"], ListMeta);
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
	export class RoleProfessionQuery {
	    roleName: string;
	    profession: string;
	    priority: number;
	    page: number;
	    pageSize: number;
	
	    static createFrom(source: any = {}) {
	        return new RoleProfessionQuery(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.roleName = source["roleName"];
	        this.profession = source["profession"];
	        this.priority = source["priority"];
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	    }
	}
	export class SiteMessageMetadata {
	    categoryCode: string;
	    isTop: boolean;
	    isHot: boolean;
	    sourceId: number;
	
	    static createFrom(source: any = {}) {
	        return new SiteMessageMetadata(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.categoryCode = source["categoryCode"];
	        this.isTop = source["isTop"];
	        this.isHot = source["isHot"];
	        this.sourceId = source["sourceId"];
	    }
	}
	export class SiteMessage {
	    id: number;
	    source: string;
	    sourceKey: string;
	    level: string;
	    title: string;
	    content: string;
	    actionLabel: string;
	    actionUrl: string;
	    actionTarget: string;
	    popup: boolean;
	    status: number;
	    publishedAt: string;
	    expiresAt: string;
	    createdBy: number;
	    metadata?: SiteMessageMetadata;
	    readAt?: string;
	    isRead?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SiteMessage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.source = source["source"];
	        this.sourceKey = source["sourceKey"];
	        this.level = source["level"];
	        this.title = source["title"];
	        this.content = source["content"];
	        this.actionLabel = source["actionLabel"];
	        this.actionUrl = source["actionUrl"];
	        this.actionTarget = source["actionTarget"];
	        this.popup = source["popup"];
	        this.status = source["status"];
	        this.publishedAt = source["publishedAt"];
	        this.expiresAt = source["expiresAt"];
	        this.createdBy = source["createdBy"];
	        this.metadata = this.convertValues(source["metadata"], SiteMessageMetadata);
	        this.readAt = source["readAt"];
	        this.isRead = source["isRead"];
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
	export class SiteMessageClaim {
	    items: SiteMessage[];
	
	    static createFrom(source: any = {}) {
	        return new SiteMessageClaim(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], SiteMessage);
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
	export class SiteMessageInbox {
	    items: SiteMessage[];
	    unreadCount: number;
	    lastSyncedAt: string;
	    syncError: string;
	
	    static createFrom(source: any = {}) {
	        return new SiteMessageInbox(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], SiteMessage);
	        this.unreadCount = source["unreadCount"];
	        this.lastSyncedAt = source["lastSyncedAt"];
	        this.syncError = source["syncError"];
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
	export class SiteMessageInput {
	    level: string;
	    title: string;
	    content: string;
	    actionLabel: string;
	    actionUrl: string;
	    actionTarget: string;
	    popup: boolean;
	    publishedAt: string;
	    expiresAt: string;
	
	    static createFrom(source: any = {}) {
	        return new SiteMessageInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.level = source["level"];
	        this.title = source["title"];
	        this.content = source["content"];
	        this.actionLabel = source["actionLabel"];
	        this.actionUrl = source["actionUrl"];
	        this.actionTarget = source["actionTarget"];
	        this.popup = source["popup"];
	        this.publishedAt = source["publishedAt"];
	        this.expiresAt = source["expiresAt"];
	    }
	}
	export class SiteMessageList {
	    items: SiteMessage[];
	    meta: ListMeta;
	    unreadCount: number;
	    lastSyncedAt: string;
	    syncError: string;
	
	    static createFrom(source: any = {}) {
	        return new SiteMessageList(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], SiteMessage);
	        this.meta = this.convertValues(source["meta"], ListMeta);
	        this.unreadCount = source["unreadCount"];
	        this.lastSyncedAt = source["lastSyncedAt"];
	        this.syncError = source["syncError"];
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
	
	export class SiteMessageQuery {
	    keyword: string;
	    readStatus: string;
	    page: number;
	    pageSize: number;
	
	    static createFrom(source: any = {}) {
	        return new SiteMessageQuery(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.keyword = source["keyword"];
	        this.readStatus = source["readStatus"];
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	    }
	}
	export class WeeklyPlanTicket {
	    id: number;
	    expiresAt: string;
	
	    static createFrom(source: any = {}) {
	        return new WeeklyPlanTicket(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.expiresAt = source["expiresAt"];
	    }
	}
	export class WeeklyPlanCommission {
	    id: number;
	    completed: boolean;
	
	    static createFrom(source: any = {}) {
	        return new WeeklyPlanCommission(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.completed = source["completed"];
	    }
	}
	export class WeeklyPlan {
	    id: number;
	    ownerId: number;
	    roleName: string;
	    profession: string;
	    priority: number;
	    nestCommissions: WeeklyPlanCommission[];
	    nestTickets: WeeklyPlanTicket[];
	    levelCommissionCount: number;
	    hasInvasion: boolean;
	    hasArk: boolean;
	    hasNightmare: boolean;
	    remark: string;
	    sortOrder: number;
	    roleProfessionId: number;
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new WeeklyPlan(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.ownerId = source["ownerId"];
	        this.roleName = source["roleName"];
	        this.profession = source["profession"];
	        this.priority = source["priority"];
	        this.nestCommissions = this.convertValues(source["nestCommissions"], WeeklyPlanCommission);
	        this.nestTickets = this.convertValues(source["nestTickets"], WeeklyPlanTicket);
	        this.levelCommissionCount = source["levelCommissionCount"];
	        this.hasInvasion = source["hasInvasion"];
	        this.hasArk = source["hasArk"];
	        this.hasNightmare = source["hasNightmare"];
	        this.remark = source["remark"];
	        this.sortOrder = source["sortOrder"];
	        this.roleProfessionId = source["roleProfessionId"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
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
	
	export class WeeklyPlanInitializationResult {
	    count: number;
	    created: number;
	    updated: number;
	
	    static createFrom(source: any = {}) {
	        return new WeeklyPlanInitializationResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.count = source["count"];
	        this.created = source["created"];
	        this.updated = source["updated"];
	    }
	}
	export class WeeklyPlanInput {
	    id: number;
	    roleProfessionId: number;
	    nestCommissions: WeeklyPlanCommission[];
	    nestTickets: WeeklyPlanTicket[];
	    levelCommissionCount: number;
	    hasInvasion: boolean;
	    hasArk: boolean;
	    hasNightmare: boolean;
	    remark: string;
	    sortOrder: number;
	
	    static createFrom(source: any = {}) {
	        return new WeeklyPlanInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.roleProfessionId = source["roleProfessionId"];
	        this.nestCommissions = this.convertValues(source["nestCommissions"], WeeklyPlanCommission);
	        this.nestTickets = this.convertValues(source["nestTickets"], WeeklyPlanTicket);
	        this.levelCommissionCount = source["levelCommissionCount"];
	        this.hasInvasion = source["hasInvasion"];
	        this.hasArk = source["hasArk"];
	        this.hasNightmare = source["hasNightmare"];
	        this.remark = source["remark"];
	        this.sortOrder = source["sortOrder"];
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
	export class WeeklyPlanList {
	    items: WeeklyPlan[];
	    meta: ListMeta;
	
	    static createFrom(source: any = {}) {
	        return new WeeklyPlanList(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], WeeklyPlan);
	        this.meta = this.convertValues(source["meta"], ListMeta);
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
	export class WeeklyPlanQuery {
	    roleName: string;
	    profession: string;
	    priority: number;
	    nestCommission: string;
	    roleProfessionId: number;
	    page: number;
	    pageSize: number;
	
	    static createFrom(source: any = {}) {
	        return new WeeklyPlanQuery(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.roleName = source["roleName"];
	        this.profession = source["profession"];
	        this.priority = source["priority"];
	        this.nestCommission = source["nestCommission"];
	        this.roleProfessionId = source["roleProfessionId"];
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	    }
	}
	export class WeeklyPlanSyncResult {
	    created: number;
	    total: number;
	
	    static createFrom(source: any = {}) {
	        return new WeeklyPlanSyncResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.created = source["created"];
	        this.total = source["total"];
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
	    buttonSize: string;
	    fontScale: number;
	
	    static createFrom(source: any = {}) {
	        return new Appearance(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.themeMode = source["themeMode"];
	        this.accent = source["accent"];
	        this.density = source["density"];
	        this.buttonSize = source["buttonSize"];
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

