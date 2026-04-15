# NutriPlan — Portal Nutricional
**by Ricardo Sandoval Solórzano, Lic. Nutrición — Morelia, Michoacán**

---

## Archivos del proyecto

| Archivo | Descripción |
|---------|-------------|
| `patient-view.html` | App principal del paciente (todo en uno) |
| `index.html` | Redirect a patient-view.html |
| `admin.html` | Panel del nutriólogo |
| `admin-app.js` | Lógica del panel admin |
| `admin-styles.css` | Estilos del admin |
| `firebase.js` | Configuración Firebase compartida |
| `firestore.rules` | Reglas de seguridad Firestore |
| `calculadora-libre.html` | Calculadora nutricional libre |
| `calculadora-paciente.html` | Calculadora para paciente |

---

## Pasos para activar autenticación (URGENTE)

### Paso 1 — Activar Firebase Authentication
1. Ve a https://console.firebase.google.com/project/portal-nutricional-693fb/authentication
2. Clic en **"Get started"**
3. En "Sign-in providers" → **Email/Password** → Activar → Guardar

### Paso 2 — Crear tu cuenta de admin
1. En Authentication → Users → **Add user**
2. Ingresa tu correo y una contraseña segura
3. Guarda el UID que te muestra (lo necesitarás para las reglas)

### Paso 3 — Aplicar reglas de Firestore
1. Ve a https://console.firebase.google.com/project/portal-nutricional-693fb/firestore/rules
2. Borra el contenido actual
3. Copia y pega el contenido de `firestore.rules`
4. Clic en **Publicar**

### Paso 4 — Subir archivos al hosting
Sube todos los archivos de esta carpeta a tu hosting (Firebase Hosting, Netlify, etc.)

---

## Generar enlace de paciente

El admin genera links en el formato:
```
https://tudominio.com/patient-view.html?id=PATIENT_ID
```

Donde `PATIENT_ID` es el ID generado al crear el paciente en el admin.

---

## Firebase Project
- **Project ID:** portal-nutricional-693fb
- **Console:** https://console.firebase.google.com/project/portal-nutricional-693fb
