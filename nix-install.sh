# Download and install required files
git clone https://github.com/wwwg/retrocord-light.git
cd retrocord-light
sudo npm -i -g i
# Lint and build
npm run lint
npm run build
echo -n "\n\nInstalled Retrocord light. Run with 'npm start'\n"