# Updates all language files from our Crowdin project.
# Requires a valid crowdin.ymt file to be present in the root.

cd ..
{
  git pull
  crowdin download -b Main
  git add .
  git commit -m "Automatic language update."
  git push
  crowdin upload sources -b Main
  crowdin upload translations -b Main
} >"logs/lang-file-$(date +"%Y-%m-%d_%H-%M").log" 2>&1
