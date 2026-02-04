# 🥗 Portal Nutricional

Portal web para nutriólogos que permite crear y compartir planes nutricionales personalizados con sus pacientes mediante links únicos.

## ✨ Características

- 📋 **Panel de Administración**: Gestiona pacientes y crea planes nutricionales
- 🔗 **Links Únicos**: Cada paciente recibe un enlace personalizado
- 📱 **Responsive**: Funciona en móvil, tablet y desktop
- 🎨 **Diseño Moderno**: Interface limpia y profesional
- 🎮 **Easter Egg Secreto**: ¡Descubre el Konami Code!

## 🎮 HUEVO DE PASCUA

Hay un easter egg escondido en el portal de pacientes. Para activarlo:

1. Abre el portal de un paciente (index.html?id=xxx)
2. Presiona esta secuencia en tu teclado: ⬆️⬆️⬇️⬇️⬅️➡️⬅️➡️ B A
3. ¡Disfruta de la sorpresa! 🎉

(Pista: Es el famoso Konami Code de los videojuegos clásicos)

## 🚀 Instalación

### 1. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. En el proyecto, ve a **Firestore Database** y créalo en modo de producción
4. Ve a **Project Settings** (⚙️) > **General**
5. En "Your apps", haz clic en el ícono Web (`</>`)
6. Registra tu app y copia la configuración

### 2. Actualizar Credenciales

Abre `firebase.js` y reemplaza las credenciales:

```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

### 3. Configurar Reglas de Firestore

En Firebase Console > Firestore Database > Rules, usa estas reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /patients/{patientId} {
      allow read: true;  // Permite lectura pública (para los links)
      allow write: if request.auth != null;  // Solo usuarios autenticados pueden escribir
    }
  }
}
```

**Nota**: Para producción, deberías agregar autenticación. Las reglas actuales permiten lectura pública (necesario para que los pacientes vean sus planes) pero requieren autenticación para escribir.

### 4. Opcional: Agregar Autenticación

Para proteger el panel admin:

1. En Firebase Console, ve a **Authentication** > **Sign-in method**
2. Habilita "Email/Password"
3. Crea un usuario en la pestaña "Users"
4. Agrega código de login en `admin.html`

## 📁 Estructura de Archivos

```
├── index.html          # Portal para pacientes
├── admin.html          # Panel de administración
├── styles.css          # Estilos del portal
├── admin-styles.css    # Estilos del admin
├── app.js              # Lógica del portal (+ Easter Egg!)
├── admin.js            # Lógica del admin
├── firebase.js         # Configuración de Firebase
└── README.md           # Este archivo
```

## 💻 Uso

### Panel de Administración (`admin.html`)

1. Abre `admin.html` en tu navegador
2. Haz clic en "➕ Nuevo Paciente"
3. Llena el formulario con:
   - Datos del paciente (nombre, edad, peso, altura, objetivo)
   - Plan de comidas (puedes agregar múltiples comidas)
   - Requerimientos nutricionales
   - Notas y recomendaciones
4. Haz clic en "💾 Guardar Plan"
5. Haz clic en "🔗 Generar Link"
6. Copia el link y envíalo a tu paciente

### Portal de Paciente (`index.html`)

1. El paciente abre el link que le enviaste
2. Ve su plan nutricional personalizado
3. Puede activar el Easter Egg con el Konami Code 🎮

## 🎨 Personalización

### Cambiar Colores

Edita las variables CSS en `styles.css` y `admin-styles.css`:

```css
:root {
    --primary-color: #4CAF50;  /* Color principal */
    --secondary-color: #45a049; /* Color secundario */
    /* ... más colores */
}
```

### Modificar Easter Egg

En `app.js`, puedes cambiar:
- Los mensajes divertidos (array `messages`)
- La secuencia de teclas (`konamiCode`)
- Los colores del confetti

## 🔒 Seguridad para Producción

Para un entorno de producción real:

1. **Agrega autenticación** al panel admin
2. **Actualiza las reglas de Firestore** para ser más restrictivas
3. **Usa HTTPS** (Firebase Hosting lo hace automáticamente)
4. **Configura dominios autorizados** en Firebase
5. **Considera agregar validación** de datos en el backend

## 🚀 Despliegue

### Opción 1: Firebase Hosting (Recomendado)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Opción 2: Cualquier servidor web

Simplemente sube todos los archivos a tu servidor. Solo necesitas que soporte archivos estáticos (HTML, CSS, JS).

## 🐛 Troubleshooting

**Error: "Firebase is not defined"**
- Verifica que `firebase.js` tenga las credenciales correctas

**No se cargan los datos**
- Verifica las reglas de Firestore
- Revisa la consola del navegador (F12) para ver errores

**El link del paciente no funciona**
- Asegúrate de que la ruta en `admin.js` apunte correctamente a `index.html`

## 📝 Próximas Mejoras

- [ ] Sistema de autenticación completo
- [ ] Exportar planes a PDF
- [ ] Envío automático de emails
- [ ] Gráficas de progreso
- [ ] App móvil nativa
- [ ] Recordatorios automáticos
- [ ] Calculadora de macros

## 🎉 Sobre el Easter Egg

El Konami Code (↑↑↓↓←→←→BA) es uno de los "cheats" más famosos de la historia de los videojuegos. Se hizo popular en juegos como Contra y Gradius. 

¡Tu equipo de desarrollo lo apreciará! 😄

## 📄 Licencia

Este proyecto es de uso libre. ¡Úsalo, modifícalo y mejóralo!

## 🤝 Contribuciones

¿Ideas para mejorar? ¡Son bienvenidas!

---

Hecho con 💚 para nutriólogos que cuidan de nosotros
