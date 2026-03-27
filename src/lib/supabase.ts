// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// En Astro (movido por Vite), las variables de entorno se leen con import.meta.env
// en lugar del clásico process.env de Node.js
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Validación de seguridad para evitar que la app arranque a ciegas si falta el .env
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Error Crítico: Faltan las variables de entorno de Supabase. " +
    "Asegúrate de que el archivo .env exista en la raíz del proyecto."
  );
}

// Inicializamos y exportamos la instancia única (Singleton) del cliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey);