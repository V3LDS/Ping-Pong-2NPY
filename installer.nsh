!macro customUnInstall
  ; Kill the process if it's running
  nsExec::Exec 'taskkill /F /IM "Online Pong Multi.exe"'
  
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Online Pong Multi"
  Delete "$DESKTOP\Online Pong Multi.lnk"
  RMDir /r "$SMPROGRAMS\Online Pong Multi"
!macroend
