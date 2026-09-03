## HTTPS production checklist (LXC)

1. Build static site
   - npm run build
2. Copy dist to /var/www/educlook/dist
3. Install and enable nginx
4. Use deploy/nginx-https.conf as site config
5. Issue certificates with certbot
   - certbot --nginx -d educlook.com -d www.educlook.com
6. Reload nginx
   - systemctl reload nginx

Notes:
- In local development, HTTP is acceptable on localhost.
- In non-local environments, app-level redirect to HTTPS is already enabled in BaseLayout.
