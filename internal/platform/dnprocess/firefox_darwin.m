//go:build darwin && cgo

#import <AppKit/AppKit.h>
#include <stdlib.h>
#include <string.h>

char *firefox_executable_path(const char *executable) {
    @autoreleasepool {
        NSString *path = [NSString stringWithUTF8String:executable];
        if (![path isAbsolutePath]) return NULL;
        path = [path stringByStandardizingPath];
        NSString *applicationPath = [path.pathExtension isEqualToString:@"app"] ? path :
            [[[path stringByDeletingLastPathComponent] stringByDeletingLastPathComponent] stringByDeletingLastPathComponent];
        NSURL *url = [NSURL fileURLWithPath:applicationPath];
        NSBundle *bundle = [NSBundle bundleWithURL:url];
        if (![bundle.bundleIdentifier isEqualToString:@"org.mozilla.firefox"] ||
            ![bundle.executablePath.lastPathComponent isEqualToString:@"firefox"] ||
            (path.length > 0 && ![url.path isEqualToString:path] && ![bundle.executablePath isEqualToString:path]) ||
            ![[NSFileManager defaultManager] isExecutableFileAtPath:bundle.executablePath]) return NULL;
        return strdup(bundle.executablePath.UTF8String);
    }
}

char *firefox_processes(void) {
    @autoreleasepool {
        NSMutableArray *items = [NSMutableArray array];
        for (NSRunningApplication *app in [NSRunningApplication runningApplicationsWithBundleIdentifier:@"org.mozilla.firefox"]) {
            if (app.terminated || app.processIdentifier <= 1) continue;
            NSString *path = app.executableURL.path;
            if (![path.lastPathComponent isEqualToString:@"firefox"]) continue;
            [items addObject:@{@"pid": @(app.processIdentifier), @"name": @"firefox", @"path": path}];
        }
        NSData *json = [NSJSONSerialization dataWithJSONObject:items options:0 error:NULL];
        if (!json) return NULL;
        return strndup(json.bytes, json.length);
    }
}

int firefox_terminate(int pid, const char *path, void **handle) {
    @autoreleasepool {
        NSRunningApplication *app = [NSRunningApplication runningApplicationWithProcessIdentifier:pid];
        if (!app || app.terminated) return 1;
        // Validate the application identity and executable on this same retained object.
        // Never issue a kill-by-name command or target Firefox content/helper processes.
        if (![app.bundleIdentifier isEqualToString:@"org.mozilla.firefox"] ||
            ![app.executableURL.lastPathComponent isEqualToString:@"firefox"] ||
            ![app.executableURL.path isEqualToString:[NSString stringWithUTF8String:path]]) return 2;
        if (![app forceTerminate]) return 3;
        *handle = [app retain];
        return 0;
    }
}

int firefox_exited(void *handle) {
    @autoreleasepool {
        return [(NSRunningApplication *)handle isTerminated] ? 1 : 0;
    }
}

void firefox_release(void *handle) {
    [(NSRunningApplication *)handle release];
}
