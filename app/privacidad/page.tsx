import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hola@tucv.ar";

export const metadata: Metadata = {
  title: "Política de privacidad — TuCV",
  description: "Cómo TuCV trata tus datos personales: qué recopilamos, para qué, con quién los compartimos y cómo ejercer tus derechos.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad" updated="julio de 2026">
      <p>
        Esta Política de Privacidad describe cómo TuCV (&quot;TuCV&quot;, &quot;nosotros&quot;) trata los
        datos personales de quienes usan tucv.ar (el &quot;Sitio&quot;), en los términos de la Ley
        25.326 de Protección de Datos Personales de la República Argentina. Se aplica junto a
        nuestros{" "}
        <a href="/terminos" className="font-semibold underline">
          Términos y Condiciones
        </a>
        .
      </p>

      <h2 className="font-bold text-base">1. Responsable del tratamiento</h2>
      <p>
        El responsable del tratamiento de tus datos personales es TuCV. Podés contactarnos por
        cualquier consulta relacionada con esta política escribiendo a{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>

      <h2 className="font-bold text-base">2. Qué datos recopilamos</h2>
      <p>
        Según si te registrás como Postulante o como Negocio, tratamos: tu nombre y foto de
        cuenta de Google (al iniciar sesión); email (de tu cuenta de Google); y, si completás un
        perfil o publicás una búsqueda, los datos que vos mismo cargues en ese formulario
        (teléfono/WhatsApp, zona o dirección aproximada, fecha de nacimiento, experiencia
        laboral, disponibilidad, estudios, referencias, CV adjunto, foto de perfil, datos de tu
        negocio, etc.). No pedimos DNI ni otros documentos de identidad para usar el Sitio.
      </p>

      <h2 className="font-bold text-base">3. Para qué usamos tus datos</h2>
      <p>Usamos tus datos personales para:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Crear y administrar tu cuenta y tu perfil o tus búsquedas publicadas.</li>
        <li>Permitirte postularte a búsquedas, o recibir y evaluar postulaciones si sos Negocio.</li>
        <li>
          Enviarte comunicaciones relacionadas con tu cuenta y tu actividad en el Sitio (nuevas
          postulaciones, vencimiento de búsquedas, resúmenes de actividad), con las opciones de
          frecuencia y desactivación descriptas en la sección 6.
        </li>
        <li>Mejorar la conexión entre Postulantes y Negocios, y prevenir fraude o abuso del Sitio.</li>
      </ul>

      <h2 className="font-bold text-base">4. Con quién compartimos tus datos</h2>
      <p>
        Como Postulante, tu información se comparte con un Negocio en dos casos, y solo en esos
        dos casos: (a) cuando te postulás a una de sus búsquedas, o (b) si activás voluntariamente
        la visibilidad de tu perfil para negocios de tu zona (opción &quot;visible para empresas
        que buscan candidatos&quot;) o el listado público en{" "}
        <a href="/postulantes" className="font-semibold underline">
          &quot;Gente lista para laburar cerca tuyo&quot;
        </a>{" "}
        (opción separada, ver sección 5). Ninguna de las dos opciones es automática: las activás
        vos, cuando querés, desde tu perfil.
      </p>
      <p>
        Usamos proveedores externos para operar el Sitio, que acceden a datos personales
        únicamente en la medida necesaria para prestar su servicio: PocketBase (nuestra base de
        datos, alojada en infraestructura propia), Google (autenticación), Resend (envío de
        emails transaccionales) y Mercado Pago (procesamiento de pagos de Negocios). No vendemos
        tus datos personales a terceros ni los usamos con fines publicitarios ajenos a TuCV.
      </p>

      <h2 className="font-bold text-base">5. Tu perfil público (opcional)</h2>
      <p>
        Si activás &quot;Quiero hacer público mi perfil&quot; desde tu perfil de Postulante,
        tu perfil aparece, sin necesidad de que nadie tenga una cuenta, en la sección pública{" "}
        <a href="/postulantes" className="font-semibold underline">
          /postulantes
        </a>
        . Ahí mostramos únicamente: tu nombre de pila y la inicial de tu apellido, ciudad/zona,
        rubros, experiencia, disponibilidad y una biografía corta si la cargaste. Nunca
        mostramos ahí tu WhatsApp, DNI, email, fecha de nacimiento, dirección exacta ni tu CV
        adjunto. Esos datos solo se comparten con un Negocio si te postulás vos mismo a su
        búsqueda. Podés desactivar esta visibilidad pública en cualquier momento desde tu perfil.
      </p>

      <h2 className="font-bold text-base">6. Tus preferencias de notificación</h2>
      <p>
        Desde{" "}
        <a href="/configuracion/notificaciones" className="font-semibold underline">
          /configuracion/notificaciones
        </a>{" "}
        podés elegir la frecuencia de cada tipo de email (al instante, en un resumen, o nunca) y
        desactivar los consejos de perfil o las novedades de TuCV. Todo email de digest o
        novedades incluye además un link de baja de un click. Los avisos estrictamente
        necesarios para el funcionamiento y seguridad de tu cuenta no se desactivan.
      </p>

      <h2 className="font-bold text-base">7. Tus derechos</h2>
      <p>
        Conforme a la Ley 25.326, tenés derecho a acceder, rectificar, actualizar y suprimir tus
        datos personales, así como a solicitar información sobre su tratamiento. Podés ejercer
        estos derechos vos mismo, en cualquier momento, editando o eliminando tu perfil desde tu
        cuenta, o escribiéndonos a{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline">
          {CONTACT_EMAIL}
        </a>
        . La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de
        la Ley 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan
        con relación al incumplimiento de las normas sobre protección de datos personales.
      </p>

      <h2 className="font-bold text-base">8. Menores de edad</h2>
      <p>
        El Sitio no está dirigido a menores de 18 años. Si sos menor de edad, necesitás la
        autorización de tu padre, madre o tutor legal para crear una cuenta o un perfil.
      </p>

      <h2 className="font-bold text-base">9. Seguridad</h2>
      <p>
        Tomamos medidas razonables para proteger tus datos personales, aunque ningún sistema es
        100% seguro. Si detectamos un incidente que afecte tus datos, te lo vamos a informar por
        los canales de contacto que tengamos disponibles.
      </p>

      <h2 className="font-bold text-base">10. Cambios a esta política</h2>
      <p>
        Podemos actualizar esta Política de Privacidad en cualquier momento. Los cambios
        relevantes se reflejan actualizando la fecha al inicio de esta página.
      </p>

      <p style={{ color: "var(--tucv-muted)" }}>
        Consultas sobre esta política:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </LegalPage>
  );
}
