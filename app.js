const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sequelize = require('./database');
const User = require('./user');
const Task = require('./task');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const moment = require('moment-timezone');
const cors = require('cors');

const app = express();

// Configuración de CORS para permitir solicitudes desde otros orígenes
app.use(cors());

// Configuración del flujo de logs: escribe en el archivo 'access.log'
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

// Middleware para parsear cuerpos de solicitud en JSON
app.use(express.json());

// Clave secreta para la firma del token JWT
const JWT_SECRET = 'clave_secreta';

// Middleware de autenticación JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Obtener el token del encabezado Authorization

    if (!token) {
        logActivity('Autenticación fallida', 'Token no proporcionado');
        return res.status(401).json({ message: 'No se proporcionó un token' });
    }

    // Verificar el token JWT
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            logActivity('Autenticación fallida', 'Token inválido o expirado');
            return res.status(403).json({ message: 'Debe iniciar sesión para acceder a esta sección' });
        }
        req.user = user; // Agregar el usuario al objeto de solicitud
        next();
    });
}

// Función para registrar actividades en el archivo 'access.log'
function logActivity(action, details) {
    const timestamp = moment().tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    const logMessage = `${timestamp} - ${action}: ${details}\n`;
    fs.appendFileSync(path.join(__dirname, 'access.log'), logMessage);
}

// Configuración de Morgan para registrar las solicitudes con la zona horaria de Colombia
morgan.token('date', () => {
    return moment().tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
});

app.use(morgan(':method :url :status :res[content-length] - :response-time ms :date[America/Bogota]', { stream: accessLogStream }));

// Función para inicializar la conexión a la base de datos y sincronizar modelos
async function initialize() {
    try {
        await sequelize.authenticate(); // Probar la conexión a la base de datos
        console.log('Conexión a la base de datos establecida correctamente.');

        await sequelize.sync({ force: false }); // Sincronizar los modelos con la base de datos
        console.log('Modelos sincronizados con la base de datos.');
    } catch (error) {
        console.error('No se pudo conectar a la base de datos:', error);
    }
}

initialize();

// Rutas de la API

// Ruta para registrar nuevos usuarios
app.post('/api/auth/register', async (req, res, next) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        logActivity('Registro fallido', 'Datos faltantes');
        return res.status(400).json({ message: 'Faltan datos para registrar el usuario' });
    }

    try {
        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        // Crear el nuevo usuario
        const user = await User.create({ username, email, password: hashedPassword });
        logActivity('Registro exitoso', `Usuario: ${username}`);
        res.status(201).json({ message: 'Usuario registrado exitosamente', user });
    } catch (error) {
        logActivity('Registro fallido', `Error: ${error.message}`);
        next(error);
    }
});

// Ruta para el inicio de sesión
app.post('/api/auth/login', async (req, res, next) => {
    const { username, password } = req.body;

    try {
        // Buscar el usuario por nombre de usuario
        const user = await User.findOne({ where: { username } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            logActivity('Login fallido', `Usuario: ${username}`);
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }

        // Generar un token JWT
        const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        logActivity('Login exitoso', `Usuario: ${username}`);
        res.json({ message: "Usuario aceptado", token });
    } catch (error) {
        logActivity('Login fallido', `Error: ${error.message}`);
        next(error);
    }
});

// Ruta para obtener todas las tareas del usuario autenticado
app.get('/api/tasks', authenticateToken, async (req, res, next) => {
    try {
        // Buscar el usuario autenticado
        const user = await User.findOne({ where: { username: req.user.username } });

        if (!user) {
            logActivity('Consulta de tareas fallida', 'Usuario no encontrado');
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Obtener todas las tareas del usuario
        const tasks = await Task.findAll({ where: { userId: user.id } });
        logActivity('Consulta de tareas exitosa', `Usuario: ${req.user.username}`);
        res.json(tasks);
    } catch (error) {
        logActivity('Consulta de tareas fallida', `Error: ${error.message}`);
        next(error);
    }
});

// Ruta para crear una nueva tarea para el usuario autenticado
app.post('/api/tasks', authenticateToken, async (req, res, next) => {
    const { title, description, status } = req.body;

    if (!title || !description || !status) {
        logActivity('Creación de tarea fallida', 'Datos faltantes');
        return res.status(400).json({ message: 'Faltan datos para crear la tarea' });
    }

    try {
        // Buscar el usuario autenticado
        const user = await User.findOne({ where: { username: req.user.username } });

        if (!user) {
            logActivity('Creación de tarea fallida', 'Usuario no encontrado');
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Crear la nueva tarea
        const task = await Task.create({ title, description, status, userId: user.id });
        logActivity('Creación de tarea exitosa', `Usuario: ${req.user.username}, Tarea: ${title}`);
        res.status(201).json({ message: 'Tarea creada exitosamente', task });
    } catch (error) {
        logActivity('Creación de tarea fallida', `Error: ${error.message}`);
        next(error);
    }
});

// Ruta para actualizar una tarea existente
app.put('/api/tasks/:id', authenticateToken, async (req, res, next) => {
    const { id } = req.params;
    const { title, description, status } = req.body;

    if (!title || !description || !status) {
        logActivity('Actualización de tarea fallida', 'Datos faltantes');
        return res.status(400).json({ message: 'Faltan datos para actualizar la tarea' });
    }

    try {
        // Buscar la tarea por ID
        const task = await Task.findOne({ where: { id } });

        if (!task) {
            logActivity('Actualización de tarea fallida', 'Tarea no encontrada');
            return res.status(404).json({ message: 'Tarea no encontrada' });
        }

        // Actualizar los datos de la tarea
        task.title = title;
        task.description = description;
        task.status = status;

        await task.save();
        logActivity('Actualización de tarea exitosa', `Usuario: ${req.user.username}, Tarea: ${id}`);
        res.json({ message: 'Tarea actualizada exitosamente', task });
    } catch (error) {
        logActivity('Actualización de tarea fallida', `Error: ${error.message}`);
        next(error);
    }
});

// Ruta para eliminar una tarea existente
app.delete('/api/tasks/:id', authenticateToken, async (req, res, next) => {
    const { id } = req.params;

    try {
        // Buscar la tarea por ID
        const task = await Task.findOne({ where: { id } });

        if (!task) {
            logActivity('Eliminación de tarea fallida', 'Tarea no encontrada');
            return res.status(404).json({ message: 'Tarea no encontrada' });
        }

        // Eliminar la tarea
        await task.destroy();
        logActivity('Eliminación de tarea exitosa', `Usuario: ${req.user.username}, Tarea: ${id}`);
        res.json({ message: 'Tarea eliminada exitosamente' });
    } catch (error) {
        logActivity('Eliminación de tarea fallida', `Error: ${error.message}`);
        next(error);
    }
});

// Manejo global de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    logActivity('Error en servidor', `Error: ${err.message}`);
    res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
});

// Nueva ruta para ver los usuarios registrados
app.get('/api/users', async (req, res, next) => {
    try {
        // Obtener todos los usuarios
        const users = await User.findAll();
        logActivity('Consulta de usuarios exitosa', `Cantidad: ${users.length}`);
        res.json(users);
    } catch (error) {
        logActivity('Consulta de usuarios fallida', `Error: ${error.message}`);
        next(error);
    }
});

// Ruta de bienvenida
app.get('/', (req, res) => {
    res.send('¡Bienvenido a la página principal!');
});

// Ruta protegida de ejemplo
app.get('/protected', authenticateToken, (req, res) => {
    logActivity('Acceso a ruta protegida', `Usuario: ${req.user.username}`);
    res.json({ message: 'Acceso a ruta protegida concedido', user: req.user });
});

// Ruta para encontrar el palíndromo más grande en el texto proporcionado
app.post('/api/palindrome', authenticateToken, (req, res, next) => {
    const { text } = req.body;

    if (!text) {
        logActivity('Búsqueda de palíndromo fallida', 'Texto no proporcionado');
        return res.status(400).json({ message: 'Falta el texto para buscar el palíndromo' });
    }

    try {
        // Convertir el texto a minúsculas
        const normalizedText = text.toLowerCase();

        // Función para verificar si una cadena es un palíndromo
        const isPalindrome = (str) => {
            const len = str.length;
            for (let i = 0; i < len / 2; i++) {
                if (str[i] !== str[len - 1 - i]) {
                    return false;
                }
            }
            return true;
        };

        // Función para encontrar el palíndromo más grande en el texto
        const findLargestPalindrome = (str) => {
            let maxPalindrome = '';
            for (let i = 0; i < str.length; i++) {
                for (let j = i + 1; j <= str.length; j++) {
                    const substr = str.slice(i, j);
                    if (isPalindrome(substr) && substr.length > maxPalindrome.length) {
                        maxPalindrome = substr;
                    }
                }
            }
            return maxPalindrome;
        };

        const largestPalindrome = findLargestPalindrome(normalizedText);

        logActivity('Búsqueda de palíndromo exitosa', `Texto: ${text}, Palíndromo: ${largestPalindrome}`);
        res.status(200).json({ largestPalindrome });
    } catch (error) {
        logActivity('Búsqueda de palíndromo fallida', `Error: ${error.message}`);
        next(error);
    }
});

// Iniciar el servidor en el puerto 3000
const port = 3000;
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
