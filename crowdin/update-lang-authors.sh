# Updates langs/README.md with the latest members, ordered alphabetically.
# Requires crowdin/.env to be setup correctly with the details in this folder.

{
  cd ..
  git pull
  node "crowdin/index.js"
  git add .
  git commit -m "Automatic contributors update."
  git push
} >"logs/lang-contr-$(date +"%Y-%m-%d_%H-%M").log" 2>&1
