# Deploy ke Hostinger

Deploy static build (Astro/Vite/React) ke Hostinger hosting:

1. Tanya domain tujuan deployment:
   - `scriptsis.id` → `~/domains/scriptsis.id/public_html/`
   - `nouma.id` → `~/domains/nouma.id/public_html/`
   - `joqie.nouma.id` → `~/domains/nouma.id/public_html/Joqie/`
2. Build project: `npm run build`
3. Buat zip dari output build:
   ```
   cd dist && zip -r ../deploy.zip * && cd ..
   ```
4. Upload via SCP:
   ```
   scp -i ~/.ssh/hostinger_scriptsis -P 65002 deploy.zip u212852160@185.214.124.85:~/domains/{domain}/public_html/
   ```
5. Extract di server:
   ```
   ssh -i ~/.ssh/hostinger_scriptsis -p 65002 u212852160@185.214.124.85 "cd ~/domains/{domain}/public_html && unzip -o deploy.zip && rm deploy.zip"
   ```
6. Verifikasi deployment berhasil
7. Cleanup local deploy.zip
