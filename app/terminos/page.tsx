import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hola@tucv.ar";

export const metadata: Metadata = {
  title: "Términos y condiciones — TuCV",
  description: "Condiciones de uso de TuCV para postulantes y empresas.",
  alternates: { canonical: "/terminos" },
};

export default function TerminosPage() {
  return (
    <LegalPage title="Términos y condiciones" updated="julio de 2026">
      <p>
        Estos Términos y Condiciones (los &quot;Términos&quot;) regulan el uso del sitio tucv.ar y de
        cualquier subdominio, aplicación o servicio asociado (en conjunto, &quot;TuCV&quot; o el
        &quot;Sitio&quot;). Al acceder, registrarte, crear un perfil, publicar una búsqueda, postularte a
        una oferta o de cualquier otra forma usar el Sitio, aceptás quedar obligado por estos
        Términos en su totalidad, sin reservas ni modificaciones de tu parte. Si no estás de
        acuerdo con alguna parte de estos Términos, tu única alternativa es dejar de usar el
        Sitio de inmediato.
      </p>

      <h2 className="font-bold text-base">1. Qué es TuCV (y qué NO es)</h2>
      <p>
        TuCV es una plataforma tecnológica que permite a terceros (&quot;Negocios&quot; o
        &quot;Empresas&quot;) publicar avisos, ofertas, búsquedas de personal o cualquier otro tipo de
        propuesta, y a otros terceros (&quot;Postulantes&quot; o &quot;Usuarios&quot;) crear un perfil y
        contactarse o postularse a esas publicaciones. TuCV actúa exclusivamente como
        intermediario tecnológico: no participa, no interviene, no audita, no verifica, no avala
        ni garantiza el contenido, la veracidad, la legalidad, la seriedad, la solvencia, la
        identidad ni las intenciones de ninguna de las partes que interactúan a través del Sitio.
      </p>
      <p>
        TuCV no es una agencia de empleo, una bolsa de trabajo regulada, un intermediario
        laboral, una empresa de recursos humanos, ni parte de ninguna relación contractual,
        laboral, comercial o de cualquier otra naturaleza que eventualmente se genere entre un
        Negocio y un Postulante. Cualquier acuerdo, contratación, pago, entrevista, encuentro
        presencial o relación de cualquier tipo que surja a partir del uso del Sitio ocurre
        exclusivamente entre esas partes, bajo su exclusiva responsabilidad, y de ningún modo
        involucra, compromete ni responsabiliza a TuCV.
      </p>
      <p>
        El Sitio puede incluir, además de búsquedas de personal en relación de dependencia,
        publicaciones sobre changas, oficios, tareas puntuales, colaboraciones, prácticas,
        pasantías, y en general cualquier tipo de oferta u oportunidad que un Negocio decida
        publicar, sin que TuCV limite, clasifique, homologue o certifique la naturaleza jurídica
        de dicha oferta. Es responsabilidad exclusiva de cada Negocio que su publicación cumpla
        con la legislación laboral, impositiva, comercial y de cualquier otra índole que le sea
        aplicable, y es responsabilidad exclusiva de cada Postulante evaluar, antes de aceptar
        cualquier propuesta, si las condiciones ofrecidas son legítimas, seguras y convenientes
        para sus intereses.
      </p>

      <h2 className="font-bold text-base">2. Todo uso del Sitio es bajo tu propio riesgo</h2>
      <p>
        El uso del Sitio, de cualquier información publicada en él, y de cualquier contacto,
        comunicación, encuentro o acuerdo derivado de esa información, se realiza{" "}
        <strong>enteramente bajo tu propio riesgo</strong>. TuCV no puede ni pretende controlar
        la conducta de los Usuarios y Negocios dentro o fuera del Sitio. Recomendamos extremar
        las precauciones habituales de sentido común antes de compartir datos personales,
        acordar encuentros presenciales, entregar dinero, bienes o documentación, o aceptar
        cualquier condición ofrecida por un tercero contactado a través de TuCV: verificar la
        identidad y legitimidad del Negocio o del Postulante, preferir encuentros en lugares
        públicos o de trabajo verificables, desconfiar de pedidos de dinero o de datos
        financieros, y denunciar ante las autoridades competentes cualquier situación de fraude,
        estafa, acoso, discriminación o delito.
      </p>

      <h2 className="font-bold text-base">3. Cuentas y contenido publicado</h2>
      <p>
        El ingreso a TuCV es exclusivamente mediante cuenta de Google. Sos el único responsable
        de toda la información, texto, foto, dato de contacto o cualquier otro contenido que
        cargues en tu perfil, en una búsqueda, en una respuesta a una pregunta filtro o en
        cualquier otra sección del Sitio, así como de que dicha información sea veraz, esté
        actualizada y no infrinja derechos de terceros. TuCV no revisa de forma previa ni
        sistemática el contenido cargado por los Usuarios, aunque se reserva el derecho, sin
        obligación de hacerlo, de eliminar, ocultar o suspender cuentas o publicaciones que a su
        exclusivo criterio resulten falsas, engañosas, discriminatorias, ofensivas, ilegales o
        contrarias al espíritu del Sitio, sin necesidad de aviso previo y sin que ello genere
        derecho a indemnización alguna a tu favor.
      </p>

      <h2 className="font-bold text-base">4. Postulantes</h2>
      <p>
        Crear y usar un perfil de Postulante es gratuito. Al guardar tu perfil, autorizás a que
        sea visible por los Negocios a los que te postulés, y, si activás la opción
        correspondiente, también por Negocios de tu zona que no hayan publicado una búsqueda
        puntual, dentro de la sección &quot;Buscar candidatos&quot;. Si además activás la opción
        separada de perfil público, tu perfil aparece en la sección pública &quot;Gente lista
        para laburar cerca tuyo&quot; (/postulantes), visible sin necesidad de cuenta, mostrando
        únicamente los datos descriptos en nuestra{" "}
        <a href="/privacidad" className="font-semibold underline">
          Política de Privacidad
        </a>{" "}
        (nunca tu WhatsApp, DNI, email, fecha de nacimiento ni CV). Cada una de estas dos
        opciones de visibilidad es independiente, opcional y reversible desde tu perfil. TuCV no
        garantiza que la publicación de tu perfil derive en una entrevista, una postulación
        exitosa o una contratación, ni asume responsabilidad alguna por el trato, las condiciones
        ofrecidas o la conducta de los Negocios o terceros que accedan a tu información.
      </p>

      <h2 className="font-bold text-base">5. Negocios</h2>
      <p>
        Crear una cuenta de Negocio y publicar búsquedas es gratuito. El plan Pro y las mejoras
        de posicionamiento (destacar una búsqueda) son funciones opcionales y pagas que se
        contratan y cobran a través de Mercado Pago, sujetas a las condiciones propias de ese
        procesador de pagos, sobre las cuales TuCV tampoco tiene control ni asume
        responsabilidad. Publicar una búsqueda no garantiza recibir postulantes, ni que los
        perfiles recibidos sean idóneos, veraces o estén disponibles.
      </p>

      <h2 className="font-bold text-base">6. Exclusión total de responsabilidad</h2>
      <p>
        En la máxima medida permitida por la ley aplicable, TuCV, su responsable, sus
        titulares, socios, desarrolladores, empleados, colaboradores y cualquier persona
        vinculada a la operación del Sitio quedan{" "}
        <strong>exentos de toda responsabilidad</strong>, directa o indirecta, por cualquier
        daño, perjuicio, pérdida (incluyendo pérdidas económicas, de oportunidades laborales, de
        datos, morales o de cualquier otra naturaleza), conflicto, incumplimiento, accidente,
        lesión, delito, fraude, estafa, discriminación, acoso o cualquier otra consecuencia que
        se derive, directa o indirectamente, de: (a) el contenido publicado por Usuarios o
        Negocios; (b) la interacción, comunicación, encuentro, acuerdo o relación laboral o
        comercial entre Usuarios y Negocios; (c) la inexactitud, falsedad o desactualización de
        cualquier dato publicado en el Sitio; (d) fallas, interrupciones, errores o
        indisponibilidad temporal o permanente del Sitio o de servicios de terceros de los que
        depende (incluyendo, sin limitación, PocketBase, Google, Mercado Pago o cualquier
        proveedor de infraestructura); (e) el uso indebido del Sitio por parte de terceros; o (f)
        cualquier otro hecho o circunstancia ajena al control razonable de TuCV.
      </p>
      <p>
        El Sitio se ofrece &quot;tal cual&quot; (&quot;as is&quot;) y &quot;según disponibilidad&quot;, sin
        garantías de ningún tipo, expresas o implícitas, incluyendo sin limitación garantías de
        funcionamiento ininterrumpido, ausencia de errores, idoneidad para un fin particular o
        seguridad absoluta de los datos. Vos asumís, y aceptás que asumís, la totalidad del
        riesgo derivado del uso del Sitio.
      </p>

      <h2 className="font-bold text-base">7. Indemnidad</h2>
      <p>
        Aceptás mantener indemne a TuCV y a su responsable frente a cualquier reclamo, demanda,
        multa o gasto (incluyendo honorarios legales razonables) que surja de: tu uso del Sitio,
        el contenido que publiques, el incumplimiento de estos Términos, o tu interacción con
        otros Usuarios o Negocios.
      </p>

      <h2 className="font-bold text-base">8. Propiedad y disponibilidad del Sitio</h2>
      <p>
        TuCV puede modificar, suspender o discontinuar, total o parcialmente, cualquier
        funcionalidad del Sitio en cualquier momento y sin previo aviso, incluyendo el cierre
        definitivo del servicio, sin que ello genere derecho a compensación alguna a favor de
        los Usuarios o Negocios.
      </p>

      <h2 className="font-bold text-base">9. Cambios a estos Términos</h2>
      <p>
        Podemos actualizar estos Términos en cualquier momento. Los cambios relevantes se van a
        reflejar actualizando la fecha que figura al inicio de esta página. El uso continuado
        del Sitio después de una modificación implica la aceptación de los nuevos Términos.
      </p>

      <h2 className="font-bold text-base">10. Ley aplicable y jurisdicción</h2>
      <p>
        Estos Términos se rigen por las leyes de la República Argentina. Para cualquier
        controversia derivada del uso del Sitio, las partes se someten a los tribunales
        ordinarios competentes, con renuncia expresa a cualquier otro fuero o jurisdicción que
        pudiera corresponder.
      </p>

      <p style={{ color: "var(--tucv-muted)" }}>
        Consultas sobre estos términos:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </LegalPage>
  );
}
