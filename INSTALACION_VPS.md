# Guía de Instalación en VPS - CertifyPro

## Requisitos del Sistema

- **Sistema Operativo**: Ubuntu 20.04 LTS o superior (recomendado)
- **RAM**: Mínimo 2GB (recomendado 4GB)
- **CPU**: 2 cores mínimo
- **Almacenamiento**: 20GB mínimo
- **Puertos**: 80, 443, 8010 (backend API)

> **NOTA**: Esta guía usa el puerto **8010** para el backend para evitar conflictos con otros servicios (8001-8004, 3000). Puedes cambiarlo según tu configuración.

## 1. Preparación del Servidor

### Actualizar el sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### Instalar dependencias básicas
```bash
sudo apt install -y git curl wget build-essential
```

## 2. Instalar Node.js (v18 o superior)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Verificar instalación
```

### Instalar Yarn
```bash
npm install -g yarn
```

## 3. Instalar Python 3.11

```bash
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
```

## 4. Instalar MongoDB

```bash
# Importar clave pública
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Agregar repositorio
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Instalar MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Iniciar y habilitar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

## 5. Clonar el Proyecto

```bash
cd /var/www
sudo git clone https://github.com/cristian138/certify.git certifypro
sudo chown -R $USER:$USER certifypro
cd certifypro
```

## 6. Configurar el Backend

### Crear entorno virtual
```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
```

### Instalar dependencias
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Configurar variables de entorno
```bash
cp .env.example .env  # Si existe, o crear nuevo
nano .env
```

Contenido del archivo `.env`:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=certifypro
JWT_SECRET=tu_clave_secreta_muy_segura_aqui
CORS_ORIGINS=https://tudominio.com,http://localhost:3000
```

### Probar el backend
```bash
uvicorn server:app --host 0.0.0.0 --port 8010
```

## 7. Configurar el Frontend

```bash
cd ../frontend
yarn install
```

### Configurar variables de entorno
```bash
nano .env
```

Contenido:
```env
REACT_APP_BACKEND_URL=https://tudominio.com
```

### Construir para producción
```bash
yarn build
```

## 8. Instalar y Configurar Nginx

```bash
sudo apt install -y nginx
```

### Crear configuración del sitio
```bash
sudo nano /etc/nginx/sites-available/certifypro
```

Contenido:
```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    # Frontend - Servir archivos estáticos
    location / {
        root /var/www/certifypro/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # API - Proxy al backend (puerto 8010)
    location /api {
        proxy_pass http://127.0.0.1:8010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }

    # Archivos subidos
    location /uploads {
        alias /var/www/certifypro/backend/uploads;
    }
}
```

### Habilitar el sitio
```bash
sudo ln -s /etc/nginx/sites-available/certifypro /etc/nginx/sites-enabled/
sudo nginx -t  # Verificar configuración
sudo systemctl restart nginx
```

## 9. Configurar SSL con Certbot (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
```

Seguir las instrucciones para configurar la renovación automática.

## 10. Configurar Servicios con Supervisor

### Instalar Supervisor
```bash
sudo apt install -y supervisor
```

### Crear configuración del backend
```bash
sudo nano /etc/supervisor/conf.d/certifypro-backend.conf
```

Contenido:
```ini
[program:certifypro-backend]
command=/var/www/certifypro/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8010
directory=/var/www/certifypro/backend
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/certifypro/backend.err.log
stdout_logfile=/var/log/certifypro/backend.out.log
environment=PATH="/var/www/certifypro/backend/venv/bin"
```

> **NOTA**: Si el puerto 8010 está ocupado, cámbialo a otro disponible (ej: 8011, 8012) y actualiza también la configuración de Nginx.

### Crear directorio de logs
```bash
sudo mkdir -p /var/log/certifypro
sudo chown -R www-data:www-data /var/log/certifypro
```

### Iniciar servicios
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start certifypro-backend
```

## 11. Configurar Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
# NO necesitas abrir el puerto 8010 externamente - Nginx hace proxy
sudo ufw enable
sudo ufw status
```

## 12. Crear Usuario Administrador

Conectarse a MongoDB y crear el primer usuario:
```bash
mongosh
use certifypro
```

O bien, registrar el usuario desde la interfaz web en `/register`.

## 13. Comandos Útiles

### Ver logs del backend
```bash
sudo tail -f /var/log/certifypro/backend.out.log
sudo tail -f /var/log/certifypro/backend.err.log
```

### Reiniciar servicios
```bash
sudo supervisorctl restart certifypro-backend
sudo systemctl restart nginx
```

### Ver estado de los servicios
```bash
sudo supervisorctl status
sudo systemctl status nginx
sudo systemctl status mongod
```

### Actualizar la aplicación
```bash
cd /var/www/certifypro
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo supervisorctl restart certifypro-backend

# Frontend
cd ../frontend
yarn install
yarn build
```

## 14. Backup de Base de Datos

### Crear backup
```bash
mongodump --db certifypro --out /var/backups/mongodb/$(date +%Y%m%d)
```

### Restaurar backup
```bash
mongorestore --db certifypro /var/backups/mongodb/20240101/certifypro
```

### Automatizar backups (cron)
```bash
crontab -e
# Agregar línea para backup diario a las 2 AM:
0 2 * * * mongodump --db certifypro --out /var/backups/mongodb/$(date +\%Y\%m\%d)
```

## 15. Solución de Problemas

### El backend no inicia
1. Verificar logs: `sudo tail -f /var/log/certifypro/backend.err.log`
2. Verificar variables de entorno: `cat /var/www/certifypro/backend/.env`
3. Verificar conexión a MongoDB: `mongosh --eval "db.adminCommand('ping')"`

### Error de conexión al frontend
1. Verificar que el build existe: `ls /var/www/certifypro/frontend/build`
2. Verificar configuración de Nginx: `sudo nginx -t`
3. Verificar logs de Nginx: `sudo tail -f /var/log/nginx/error.log`

### Certificados SSL no renuevan
```bash
sudo certbot renew --dry-run
```

## Soporte

Para soporte técnico o preguntas, contactar a:
- Email: soporte@tudominio.com
- Documentación: /app/memory/PRD.md

---

## Resumen de Puertos

| Servicio | Puerto | Notas |
|----------|--------|-------|
| Nginx (HTTP) | 80 | Público |
| Nginx (HTTPS) | 443 | Público |
| Backend API | 8010 | Solo interno (proxy Nginx) |
| MongoDB | 27017 | Solo localhost |

> **Tus otros sistemas**: 8001, 8002, 8003, 8004, 3000 quedan libres.
