# CertifyPro - Sistema de Certificaciones Digitales

## Descripción General
Plataforma web para la generación automática de certificaciones digitales verificables mediante códigos QR de seguridad para Academia Jotuns Club SAS.

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB (Motor async)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Autenticación**: JWT
- **Generación**: Pillow, qrcode, ReportLab

## Funcionalidades Implementadas

### Autenticación y Usuarios
- [x] Registro y login con JWT
- [x] Roles: Admin y Operador
- [x] Gestión de usuarios (admin)

### Gestión de Plantillas
- [x] Carga de imágenes de fondo
- [x] Editor visual drag-and-drop
- [x] Campos dinámicos configurables
- [x] Propiedades: posición, tamaño, fuente, color, alineación

### Fuentes Disponibles
- Arial, Helvetica, Times New Roman, Georgia, Courier New
- Verdana, Palatino, Garamond, Bookman
- Comic Sans MS, Trebuchet MS, Impact
- **Cursivas elegantes**: Dancing Script, Great Vibes, Parisienne, Allura

### Generación de Certificados
- [x] Generación individual
- [x] Generación masiva desde Excel
- [x] Soporte para hasta 3 representantes
- [x] Códigos únicos y QR de verificación
- [x] Descarga individual en PNG
- [x] **Descarga de lote como PDF único**

### Validación Pública
- [x] Página de verificación con QR
- [x] Diseño responsive
- [x] Contador de validaciones

### Estadísticas
- [x] Dashboard con métricas
- [x] Certificados totales y del mes
- [x] Total de validaciones

## Estructura de Datos

### Excel para Carga Masiva
| Columna | Descripción | Requerido |
|---------|-------------|-----------|
| participant_name | Nombre del participante | Sí |
| document_id | Número de documento | Sí |
| certifier_name | Nombre del certificador | Sí |
| representative_name | Representante 1 | Sí |
| representative_name_2 | Representante 2 | No |
| representative_name_3 | Representante 3 | No |

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuario actual

### Plantillas
- `GET /api/templates` - Listar
- `POST /api/templates` - Crear
- `GET /api/templates/{id}` - Obtener
- `PUT /api/templates/{id}` - Actualizar
- `DELETE /api/templates/{id}` - Eliminar
- `GET /api/templates/{id}/image` - Imagen de fondo

### Certificados
- `GET /api/certificates` - Listar
- `POST /api/certificates` - Crear individual
- `POST /api/certificates/batch` - Crear masivo
- `GET /api/certificates/{id}/download` - Descargar PNG
- `POST /api/certificates/batch-pdf` - Descargar lote como PDF

### Verificación Pública
- `GET /api/verify/{unique_code}` - Verificar certificado

### Estadísticas
- `GET /api/stats` - Métricas del dashboard

## Credenciales de Prueba
- **Email**: admin@jotuns.com
- **Password**: admin123

## Documentación
- `/app/INSTALACION_VPS.md` - Guía completa de instalación en VPS

## Tareas Pendientes

### P0 - Alta Prioridad
- [ ] Sección de Reportes (por fecha, evento, descargas, validaciones)

### P1 - Media Prioridad
- [ ] Registro de auditoría completo
- [ ] Refactorizar server.py en múltiples routers

### P2 - Baja Prioridad
- [ ] Integración de firma electrónica
- [ ] APIs externas
- [ ] Centralizar estado con Zustand/Redux

## Changelog

### 2026-02-13
- Completada exportación masiva a PDF
- Agregadas fuentes cursivas (Dancing Script, Great Vibes, Parisienne, Allura)
- Soporte para 3 representantes en carga masiva
- Removida marca de Emergent
- Título cambiado a "Certificados | Academia Jotuns Club SAS"
- Creada guía de instalación VPS
