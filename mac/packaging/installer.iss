; Inno Setup script for the Windows installer (built by CI).
;   iscc /DAppVersion=2.0.0 /DSourceDir=..\build\windows\x64\runner\Release packaging\installer.iss
#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif
#ifndef SourceDir
  #define SourceDir "..\build\windows\x64\runner\Release"
#endif

[Setup]
AppId={{6A0C1C1E-5E7B-4C4B-9D7E-57A7C11E2B10}
AppName=Watchy
AppVersion={#AppVersion}
AppPublisher=Watchy
DefaultDirName={autopf}\Watchy
DefaultGroupName=Watchy
DisableProgramGroupPage=yes
; Per-user install: no admin prompt, and the app can update itself silently.
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=..\dist
OutputBaseFilename=Watchy-{#AppVersion}-windows-x64-setup
SetupIconFile=..\windows\runner\resources\app_icon.ico
UninstallDisplayIcon={app}\Watchy.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=force

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Watchy"; Filename: "{app}\Watchy.exe"
Name: "{autodesktop}\Watchy"; Filename: "{app}\Watchy.exe"; Tasks: desktopicon

[Run]
; Runs after a normal install (checkbox) and after a silent self-update.
Filename: "{app}\Watchy.exe"; Description: "{cm:LaunchProgram,Watchy}"; Flags: nowait postinstall
