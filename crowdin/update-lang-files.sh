# Updates all language files from our Crowdin project.
# Requires a valid crowdin.ymt file to be present in the root.

cd ..
{
  git pull

  # Lang files.
  crowdin download -b Main
  crowdin upload sources -b Main
  crowdin upload translations -b Main

  if [[ $(git status --porcelain) ]]; then
    # Cont files.
    node "crowdin/index.js"

    # Commit.
    git add .
    git commit -m "Automatic language update."
    git push
  fi
} >"logs/lang-$(date +"%Y-%m-%d_%H-%M").log" 2>&1
