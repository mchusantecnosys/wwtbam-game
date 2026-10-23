import type { Metadata } from 'next';
import { Outfit, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: '¿Quién Quiere Ser Millonario? — Edición Académica UG',
  description:
    'Juego interactivo de preguntas y respuestas estilo ¿Quién Quiere Ser Millonario? para Matemáticas, Física y Lenguaje con base de datos personalizable y efectos de sonido dinámicos.',
  openGraph: {
    title: '¿Quién Quiere Ser Millonario? — Edición Académica UG',
    description:
      'Juego interactivo de preguntas y respuestas estilo ¿Quién Quiere Ser Millonario? para Matemáticas, Física y Lenguaje con base de datos personalizable y efectos de sonido dinámicos.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '¿Quién Quiere Ser Millonario? — Edición Académica UG',
    description:
      'Juego interactivo de preguntas y respuestas estilo ¿Quién Quiere Ser Millonario? para Matemáticas, Física y Lenguaje con base de datos personalizable y efectos de sonido dinámicos.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${outfit.variable} ${jakarta.variable} ${jetbrains.variable} dark`}
    >
      <body
        suppressHydrationWarning
        className="bg-[#060916] text-slate-100 antialiased selection:bg-amber-500/30 selection:text-amber-200 overflow-hidden"
        style={{ fontFamily: 'var(--font-sans), sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}
