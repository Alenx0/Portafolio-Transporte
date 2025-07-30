# 🚚 Proyecto: Sistema de Gestión para Transporte Unión Salazar

Sistema web completo desarrollado con Flask y PostgreSQL para la gestión de conductores, turnos y rendiciones de gastos para la empresa Transporte Unión Salazar. Este proyecto centraliza la operación, mejora la comunicación y provee un panel de administración para la supervisión.

---

## 📸 Capturas de Pantalla

**Panel de Conductor - Calendario de Turnos**
![Vista del Calendario del Conductor](./static/img/capturas/dashboard-conductor.png)

**Panel de Conductor - Rendición de Gastos**
![Vista de Rendición de Gastos](./static/img/capturas/rendicion-gastos.png)

**Panel de Administración**
![Vista del Panel de Administración](./static/img/capturas/panel-admin.png)


---

## 🚀 Tecnologías Utilizadas

* **Backend:**
    * ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
    * ![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
    * ![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)
* **Base de Datos:**
    * ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
    * Flask-Migrate (Alembic) para el control de versiones de la base de datos.
* **Frontend:**
    * HTML5
    * CSS3 (con Variables, Flexbox y Grid)
    * JavaScript (ES6+)
* **Herramientas:**
    * Git y GitHub para el control de versiones.
    * `venv` para la gestión del entorno virtual.

---

## ✨ Características Principales

* **Sistema de Autenticación:** Registro y Login de usuarios con contraseñas hasheadas para máxima seguridad.
* **Roles de Usuario:**
    * **Conductor:** Puede configurar su turno (ej. 7x7, 14x14), visualizar su calendario de trabajo/descanso, iniciar períodos de rendición y registrar gastos detallados.
    * **Administrador:** Tiene una vista general de todos los conductores. Puede ver los detalles, calendario y rendiciones de cada conductor de forma individual.
* **Dashboard Interactivo:** La interfaz se construye dinámicamente con JavaScript, comunicándose con el backend a través de una API RESTful sin recargar la página para una experiencia fluida.
* **Gestión de Gastos:** Cálculo automático de saldo restante y registro persistente en la base de datos.
* **Diseño Responsivo:** Interfaz completamente funcional y estéticamente agradable en dispositivos móviles y de escritorio.

---

## 🔧 Instalación y Uso Local

Para ejecutar este proyecto en una máquina local, se deben seguir estos pasos:

1.  **Clona el repositorio:**
    ```bash
    git clone [https://github.com/Alenx0/Portafolio-Transporte.git](https://github.com/Alenx0/Portafolio-Transporte.git)
    cd Portafolio-Transporte
    ```

2.  **Crea y activa un entorno virtual:**
    ```bash
    # En Windows
    python -m venv venv
    venv\Scripts\activate
    ```

3.  **Instala las dependencias:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configura la Base de Datos PostgreSQL:**
    * Asegúrate de tener PostgreSQL instalado y corriendo.
    * Crea una base de datos y un usuario. Por ejemplo:
        * Base de datos: `transporte_db`
        * Usuario: `transporte_user`
        * Contraseña: `montana33`
    * Actualiza la URL de conexión en `app.py` si tus credenciales son diferentes.

5.  **Aplica las migraciones de la base de datos para crear las tablas:**
    ```bash
    flask db upgrade
    ```

6.  **Ejecuta la aplicación:**
    ```bash
    flask run
    ```
    La aplicación estará disponible en `http://127.0.0.1:5000`.