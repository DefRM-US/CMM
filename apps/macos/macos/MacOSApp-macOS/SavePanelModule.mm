#import "SavePanelModule.h"

#import <Cocoa/Cocoa.h>

@implementation SavePanelModule

RCT_EXPORT_MODULE();

RCT_REMAP_METHOD(showSavePanel,
                 options:(NSDictionary *)options
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSSavePanel *panel = [NSSavePanel savePanel];
    panel.canCreateDirectories = YES;
    panel.extensionHidden = NO;

    NSString *defaultFileName = options[@"defaultFileName"];
    if ([defaultFileName isKindOfClass:[NSString class]] && defaultFileName.length > 0) {
      panel.nameFieldStringValue = defaultFileName;
    }

    NSArray *allowedExtensions = options[@"allowedExtensions"];
    if ([allowedExtensions isKindOfClass:[NSArray class]] && allowedExtensions.count > 0) {
      panel.allowedFileTypes = allowedExtensions;
    }

    [panel beginWithCompletionHandler:^(NSModalResponse result) {
      if (result == NSModalResponseOK) {
        NSURL *url = panel.URL;
        if (url && url.path.length > 0) {
          resolve(url.path);
        } else {
          resolve([NSNull null]);
        }
      } else {
        resolve([NSNull null]);
      }
    }];
  });
}

@end
