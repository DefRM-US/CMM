#import "OpenPanelModule.h"

#import <Cocoa/Cocoa.h>

@implementation OpenPanelModule

RCT_EXPORT_MODULE();

RCT_REMAP_METHOD(showOpenPanel,
                 options:(NSDictionary *)options
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    panel.canChooseFiles = YES;
    panel.canChooseDirectories = NO;
    panel.allowsMultipleSelection = YES;
    panel.canCreateDirectories = NO;
    panel.extensionHidden = NO;

    NSArray *allowedExtensions = options[@"allowedExtensions"];
    if ([allowedExtensions isKindOfClass:[NSArray class]] && allowedExtensions.count > 0) {
      panel.allowedFileTypes = allowedExtensions;
    }

    NSNumber *allowsMultiple = options[@"allowsMultipleSelection"];
    if ([allowsMultiple isKindOfClass:[NSNumber class]]) {
      panel.allowsMultipleSelection = allowsMultiple.boolValue;
    }

    [panel beginWithCompletionHandler:^(NSModalResponse result) {
      if (result == NSModalResponseOK) {
        NSArray<NSURL *> *urls = panel.URLs;
        NSMutableArray<NSString *> *paths = [NSMutableArray array];
        for (NSURL *url in urls) {
          if (url.path.length > 0) {
            [paths addObject:url.path];
          }
        }
        resolve(paths.count > 0 ? paths : [NSNull null]);
      } else {
        resolve([NSNull null]);
      }
    }];
  });
}

@end
