Unicode true

####
## Please note: Template replacements don't work in this file. They are provided with default defines like
## mentioned underneath.
## If the keyword is not defined, "wails_tools.nsh" will populate them.
## If they are defined here, "wails_tools.nsh" will not touch them. This allows you to use this project.nsi manually
## from outside of Wails for debugging and development of the installer.
##
## Run the Wails v3 package task once to populate "wails_tools.nsh":
## > wails3 task windows:package ARCH=amd64
## Then you can call makensis on this file with specifying the path to your binary:
## For a AMD64 only installer:
## > makensis -DARG_WAILS_AMD64_BINARY=..\..\bin\app.exe
## For a ARM64 only installer:
## > makensis -DARG_WAILS_ARM64_BINARY=..\..\bin\app.exe
## For a installer with both architectures:
## > makensis -DARG_WAILS_AMD64_BINARY=..\..\bin\app-amd64.exe -DARG_WAILS_ARM64_BINARY=..\..\bin\app-arm64.exe
####
## The following information is taken from the wails_tools.nsh file, but they can be overwritten here.
####
## !define INFO_PROJECTNAME    "my-project" # Default "cull-pear"
## !define INFO_COMPANYNAME    "My Company" # Default "zxm965"
## !define INFO_PRODUCTNAME    "Product Name" # Default "Cull Pear"
## !define INFO_PRODUCTVERSION "1.0.0"     # Default "0.0.4"
## !define INFO_COPYRIGHT      "(c) Now, My Company" # Default "© 2026, zxm965"
###
## !define PRODUCT_EXECUTABLE  "Application.exe"      # Default "${INFO_PROJECTNAME}.exe"
## !define UNINST_KEY_NAME     "UninstKeyInRegistry"  # Default "${INFO_COMPANYNAME}${INFO_PRODUCTNAME}"
####
## !define REQUEST_EXECUTION_LEVEL "admin"            # Default "admin"  see also https://nsis.sourceforge.io/Docs/Chapter4.html
## !define WAILS_INSTALL_SCOPE     "user"             # Default "machine" - set to "user" for per-user install ($LOCALAPPDATA) without UAC prompt
####
## Include the wails tools
####
!include "wails_tools.nsh"

# The version information for this two must consist of 4 parts
VIProductVersion "${INFO_PRODUCTVERSION}.0"
VIFileVersion    "${INFO_PRODUCTVERSION}.0"

VIAddVersionKey "CompanyName"     "${INFO_COMPANYNAME}"
VIAddVersionKey "FileDescription" "${INFO_PRODUCTNAME} Installer"
VIAddVersionKey "ProductVersion"  "${INFO_PRODUCTVERSION}"
VIAddVersionKey "FileVersion"     "${INFO_PRODUCTVERSION}"
VIAddVersionKey "LegalCopyright"  "${INFO_COPYRIGHT}"
VIAddVersionKey "ProductName"     "${INFO_PRODUCTNAME}"

# Enable HiDPI support. https://nsis.sourceforge.io/Reference/ManifestDPIAware
ManifestDPIAware true

!include "MUI.nsh"

!define MUI_ICON "..\icon.ico"
!define MUI_UNICON "..\icon.ico"
# !define MUI_WELCOMEFINISHPAGE_BITMAP "resources\leftimage.bmp" #Include this to add a bitmap on the left side of the Welcome Page. Must be a size of 164x314
!define MUI_FINISHPAGE_NOAUTOCLOSE # Wait on the INSTFILES page so the user can take a look into the details of the installation steps
!define MUI_ABORTWARNING # This will warn the user if they exit from the installer.

Var UpdateMode
Var PreviousExecutable
Var DiscardedExecutable

!insertmacro MUI_PAGE_WELCOME # Welcome to the installer page.
# !insertmacro MUI_PAGE_LICENSE "resources\eula.txt" # Adds a EULA page to the installer
!define MUI_PAGE_CUSTOMFUNCTION_PRE UpdateDirectoryPage
!insertmacro MUI_PAGE_DIRECTORY # Initial installations can choose a folder.
!insertmacro MUI_PAGE_INSTFILES # Installing page.
!define MUI_FINISHPAGE_RUN "$INSTDIR\${PRODUCT_EXECUTABLE}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch ${INFO_PRODUCTNAME}"
!define MUI_FINISHPAGE_RUN_FUNCTION LaunchInstalledApplication
!insertmacro MUI_PAGE_FINISH # Finished installation page.

!insertmacro MUI_UNPAGE_INSTFILES # Uninstalling page

!insertmacro MUI_LANGUAGE "English" # Set the Language of the installer

## The following two statements can be used to sign the installer and the uninstaller. The path to the binaries are provided in %1
#!uninstfinalize 'signtool --file "%1"'
#!finalize 'signtool --file "%1"'

Name "${INFO_PRODUCTNAME}"
OutFile "..\..\..\bin\${INFO_PROJECTNAME}-${ARCH}-installer.exe" # Name of the installer's file.
!if "${WAILS_INSTALL_SCOPE}" == "user"
    !define DEFAULT_INSTALL_DIR "$LOCALAPPDATA\Programs\${INFO_PRODUCTNAME}"
!else
    !define DEFAULT_INSTALL_DIR "$PROGRAMFILES64\${INFO_COMPANYNAME}\${INFO_PRODUCTNAME}"
!endif
InstallDir "${DEFAULT_INSTALL_DIR}"
ShowInstDetails show # This will always show the installation details.

Function .onInit
   !insertmacro wails.checkArchitecture

   # A new updater always supplies the exact target after /D, even when that
   # directory happens to equal the default and stale registry data differs.
   ${GetParameters} $R0
   ClearErrors
   ${GetOptions} $R0 "/UPDATE" $R1
   IfErrors 0 updateModeDetected
   Goto restoreInstallDirectory
updateModeDetected:
   StrCpy $UpdateMode 1
   Goto installDirectoryReady
restoreInstallDirectory:

   # Preserve an explicitly supplied /D path. Without /D, recover the existing
   # install directory so silent updates launched by older clients can replace
   # custom and non-system-drive installations instead of using the C: default.
   StrCmp $INSTDIR "${DEFAULT_INSTALL_DIR}" 0 installDirectoryReady

   SetRegView 64
   !if "${WAILS_INSTALL_SCOPE}" == "user"
       ReadRegStr $0 HKCU "${UNINST_KEY}" "InstallLocation"
       ReadRegStr $1 HKCU "${UNINST_KEY}" "DisplayIcon"
   !else
       ReadRegStr $0 HKLM "${UNINST_KEY}" "InstallLocation"
       ReadRegStr $1 HKLM "${UNINST_KEY}" "DisplayIcon"
   !endif
   StrCmp $0 "" 0 validatePreviousInstallDirectory
   StrCmp $1 "" installDirectoryReady
   ${GetParent} "$1" $0

validatePreviousInstallDirectory:
   IfFileExists "$0\${PRODUCT_EXECUTABLE}" 0 installDirectoryReady
   StrCpy $INSTDIR "$0"

installDirectoryReady:
FunctionEnd

Function UpdateDirectoryPage
    # In-app updates always use the running application's directory. Changing
    # it here would make post-install verification and recovery target another
    # copy, and could silently move custom installations back to C:.
    StrCmp $UpdateMode 1 0 +2
    Abort
FunctionEnd

Function LaunchInstalledApplication
    StrCmp $UpdateMode 1 updateLaunchRequested
    ClearErrors
    Exec '"$INSTDIR\${PRODUCT_EXECUTABLE}"'
    IfErrors 0 launchComplete
    MessageBox MB_OK|MB_ICONSTOP "The application could not be started. Please open ${PRODUCT_EXECUTABLE} from the installation folder."
    Goto launchComplete
updateLaunchRequested:
    # The observer verifies the release hash and owns the single restart.
    # An unchecked finish-page checkbox leaves the updated app closed.
    ClearErrors
    FileOpen $0 "$EXEDIR\launch-requested" w
    IfErrors launchRequestFailed
    FileWrite $0 "launch"
    FileClose $0
    IfErrors launchRequestFailed launchComplete
launchRequestFailed:
    MessageBox MB_OK|MB_ICONSTOP "The update was installed, but automatic launch could not be requested. Please open ${PRODUCT_EXECUTABLE} from the installation folder."
launchComplete:
FunctionEnd

Function RestorePreviousExecutable
    StrCmp $PreviousExecutable "" restoreComplete
    IfFileExists "$PreviousExecutable" 0 restoreComplete
    # Avoid copying over a recently mapped failed image during rollback too.
    IfFileExists "$INSTDIR\${PRODUCT_EXECUTABLE}" 0 restoreOldName
    GetTempFileName $DiscardedExecutable "$INSTDIR"
    Delete "$DiscardedExecutable"
    ClearErrors
    Rename "$INSTDIR\${PRODUCT_EXECUTABLE}" "$DiscardedExecutable"
    IfErrors restoreFailed
restoreOldName:
    ClearErrors
    Rename "$PreviousExecutable" "$INSTDIR\${PRODUCT_EXECUTABLE}"
    IfErrors restoreFailed
    Delete "$DiscardedExecutable"
    Goto restoreComplete
restoreFailed:
    IfSilent restoreComplete
    MessageBox MB_OK|MB_ICONSTOP "The previous executable could not be restored. Its backup is at:$\r$\n$PreviousExecutable"
restoreComplete:
FunctionEnd

Section
    !insertmacro wails.setShellContext

    # An already running application has a working WebView2 runtime. Avoid
    # creating a bootstrapper process tree during an in-app update.
    ${GetParameters} $R0
    ClearErrors
    ${GetOptions} $R0 "/UPDATE" $R1
    IfErrors installWebviewRuntime skipWebviewRuntime
installWebviewRuntime:
    !insertmacro wails.webview2runtime
skipWebviewRuntime:

    SetOutPath $INSTDIR

    # Windows may retain the old image lock after the parent has exited.
    # Rename it to a unique name on the same volume before extracting the new
    # file; both installation and rollback avoid truncating a mapped image.
    IfFileExists "$INSTDIR\${PRODUCT_EXECUTABLE}" 0 targetVacant
    GetTempFileName $PreviousExecutable "$INSTDIR"
    Delete "$PreviousExecutable"
    ClearErrors
    Rename "$INSTDIR\${PRODUCT_EXECUTABLE}" "$PreviousExecutable"
    IfErrors executableWriteFailed
targetVacant:
    # Handle locked files ourselves; do not offer an Ignore action that could
    # leave a missing executable while completing the installation.
    SetOverwrite try
    ClearErrors
    !insertmacro wails.files
    IfErrors executableWriteFailed

    Delete "$PreviousExecutable"

    CreateShortcut "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}"
    CreateShortCut "$DESKTOP\${INFO_PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}"

    !insertmacro wails.associateFiles
    !insertmacro wails.associateCustomProtocols

    !insertmacro wails.writeUninstaller
    SetRegView 64
    !if "${WAILS_INSTALL_SCOPE}" == "user"
        WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
    !else
        WriteRegStr HKLM "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
    !endif
    Goto installationComplete
executableWriteFailed:
    # The updater can retry transient locks. Never report success or overwrite
    # uninstall metadata when the application file could not be written.
    Call RestorePreviousExecutable
    IfSilent updateWriteFailureReported
    MessageBox MB_OK|MB_ICONSTOP "The application could not be updated. Close any other running copies and retry. The previous executable has been retained."
updateWriteFailureReported:
    SetErrorLevel 73
    Quit
installationComplete:
SectionEnd

Section "uninstall"
    !insertmacro wails.setShellContext

    RMDir /r "$AppData\${PRODUCT_EXECUTABLE}" # Remove the WebView2 DataPath
    Delete "$AppData\cull-pear\installation.json"
    RMDir "$AppData\cull-pear"

    RMDir /r $INSTDIR

    Delete "$SMPROGRAMS\${INFO_PRODUCTNAME}.lnk"
    Delete "$DESKTOP\${INFO_PRODUCTNAME}.lnk"

    !insertmacro wails.unassociateFiles
    !insertmacro wails.unassociateCustomProtocols

    !insertmacro wails.deleteUninstaller
SectionEnd
