import { useEffect, useState } from "react";
import tiendas from "./tiendas";
import jsPDF from "jspdf";
import logoRutas from "./assets/logo-rutas.png";
import { supabase } from "./supabase";
import autoTable from "jspdf-autotable";
import "./App.css";

function App() {
  

  const [pantalla, setPantalla] = useState("entrega");
  const [mostrarBienvenida, setMostrarBienvenida] = useState(true);
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [tiendaId, setTiendaId] = useState(1);
  const [editandoIndex, setEditandoIndex] = useState(null);
const [modoEdicion, setModoEdicion] = useState(false);
const [usuario, setUsuario] = useState(null);
const [loginEmail, setLoginEmail] = useState("");
const [loginPassword, setLoginPassword] = useState("");
const [cargandoLogin, setCargandoLogin] = useState(true);
const [perfil, setPerfil] = useState(null);
const [mostrarRegistro, setMostrarRegistro] = useState(false);
const [registroNombre, setRegistroNombre] = useState("");
const [registroEmail, setRegistroEmail] = useState("");
const [registroPassword, setRegistroPassword] = useState("");

  const [tortillaDejada, setTortillaDejada] = useState("");
  const [tortillaDevuelta, setTortillaDevuelta] = useState("");
  const [masaDejada, setMasaDejada] = useState("");
  const [masaDevuelta, setMasaDevuelta] = useState("");
  const [totoposDejados, setTotoposDejados] = useState("");
  const [cobrado, setCobrado] = useState("");
  const [registros, setRegistros] = useState([]);
  const [rutasCerradas, setRutasCerradas] = useState([]);
const [inventario, setInventario] = useState(() => {
  const guardado = localStorage.getItem("inventarioRutaMiTierra");
  return guardado
    ? JSON.parse(guardado)
    : {
        tortillaInicial: "",
        masaInicial: "",
        totoposInicial: "",
      };
});

useEffect(() => {
  localStorage.setItem("inventarioRutaMiTierra", JSON.stringify(inventario));
}, [inventario]);



useEffect(() => {
  const revisarSesion = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.log("Error al revisar sesión:", error.message);
        setUsuario(null);
        setPerfil(null);
        return;
      }

      const session = data.session;

      setUsuario(session?.user ?? null);

     if (session?.user) {
  await cargarPerfil(session.user.id);
  await cargarEntregas();
} else {
  setPerfil(null);
}
    } catch (error) {
      console.log("Error inesperado:", error);
      setUsuario(null);
      setPerfil(null);
    } finally {
      setCargandoLogin(false);
    }
  };

  revisarSesion();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setUsuario(session?.user ?? null);

    if (session?.user) {
      cargarPerfil(session.user.id);
    } else {
      setPerfil(null);
    }

    setCargandoLogin(false);
  });

  return () => subscription.unsubscribe();
}, []);

useEffect(() => {
  const timer = setTimeout(() => {
    setMostrarBienvenida(false);
  }, 8000);

  return () => clearTimeout(timer);
}, []);
const iniciarRutaNueva = async () => {
  const confirmar = window.confirm(
    "¿Quieres cerrar la ruta actual y guardarla en el historial?"
  );

  if (!confirmar) return;

  console.log("REGISTROS ANTES DE CERRAR:", registros);

  if (registros.length > 0) {
    const rutaCerrada = {
      id: Date.now(),
      fechaCierre: new Date().toLocaleString(),
      inventarioInicial: inventario,
      registros: registros,
      resumen: {
        tiendasVisitadas: registros.length,
        ventaTotal: totalDia,
        dineroCobrado: cobradoDia,
        saldoPendiente: pendienteDia,
        tortillaEntregada: tortillaEntregadaDia,
        masaEntregada: masaEntregadaDia,
        totoposVendidos: totoposVendidosDia,
        tortillaRestante: tortillaRestante,
        masaRestante: masaRestante,
        totoposRestantes: totoposRestantes,
      },
    };

    const { error } = await supabase.from("rutas_cerradas").insert({
  usuario_id: usuario.id,
  creada_por_nombre: perfil?.nombre || usuario?.email || "",
  total_venta: totalDia,
  total_cobrado: cobradoDia,
  total_pendiente: pendienteDia,
  tiendas_visitadas: registros.length,
  total_tortilla_kg: tortillaEntregadaDia,
  total_masa_kg: masaEntregadaDia,
  total_totopos: totoposVendidosDia,
});

if (error) {
  alert("Error al cerrar ruta: " + error.message);
  return;
}

    setRutasCerradas([rutaCerrada, ...rutasCerradas]);
  }

  const idsRegistros = registros
  .filter((r) => r.id)
  .map((r) => r.id);
  console.log("IDS A CERRAR:", idsRegistros);

if (idsRegistros.length > 0) {
  const { error: errorCerrarEntregas } = await supabase
    .from("entregas")
    .update({ ruta_cerrada: true })
    .in("id", idsRegistros);

  if (errorCerrarEntregas) {
    alert("Error al cerrar entregas: " + errorCerrarEntregas.message);
    return;
  }
}

  setRegistros([]);
  setInventario({
    tortillaInicial: "",
    masaInicial: "",
    totoposInicial: "",
  });

  setPantalla("inventario");
};
const borrarRegistro = async (indexABorrar) => {
  const confirmar = window.confirm(
    "¿Seguro que quieres borrar este registro? Esta acción no se puede deshacer."
  );

  if (!confirmar) return;

  const nuevosRegistros = registros.filter((_, index) => index !== indexABorrar);
  const registro = registros[indexABorrar];

if (registro?.id) {
  const { error } = await supabase
    .from("entregas")
    .delete()
    .eq("id", registro.id);

  if (error) {
    alert("Error al borrar: " + error.message);
    return;
  }
}

await cargarEntregas();
};
const editarRegistro = (registro, index) => {
  const tiendaEncontrada = tiendas.find(
    (tienda) => tienda.nombre === registro.tienda
  );

  if (tiendaEncontrada) {
    setTiendaId(tiendaEncontrada.id);
    setBusqueda(tiendaEncontrada.nombre);
  }

  setTortillaDejada(registro.tortillaDejada || "");
  setTortillaDevuelta(registro.tortillaDevuelta || "");
  setMasaDejada(registro.masaDejada || "");
  setMasaDevuelta(registro.masaDevuelta || "");
  setTotoposDejados(registro.totoposDejados || "");
  setCobrado(registro.cobrado || "");

  setEditandoIndex(index);
  setModoEdicion(true);
  setPantalla("entrega");
};
const borrarRutaCerrada = (idRuta) => {
  const confirmar = window.confirm(
    "¿Seguro que quieres borrar esta ruta cerrada? Esta acción no se puede deshacer."
  );

  if (!confirmar) return;

  const nuevasRutas = rutasCerradas.filter((ruta) => ruta.id !== idRuta);
setRutasCerradas(nuevasRutas);

  if (rutaSeleccionada && rutaSeleccionada.id === idRuta) {
    setRutaSeleccionada(null);
    setPantalla("rutasCerradas");
  }
};

const exportarRutaCSV = (ruta) => {
  const encabezados = [
    "Tienda",
    "Fecha",
    "Tortilla dejada",
    "Tortilla devuelta",
    "Masa dejada",
    "Masa devuelta",
    "Totopos",
    "Total venta",
    "Cobrado",
    "Pendiente",
  ];

  const filas = ruta.registros.map((r) => [
    r.tienda,
    r.fecha,
    r.tortillaDejada,
    r.tortillaDevuelta,
    r.masaDejada,
    r.masaDevuelta,
    r.totoposDejados,
    r.totalVenta,
    r.cobrado,
    r.saldoPendiente,
  ]);

  const resumen = [
    [],
    ["RESUMEN"],
    ["Fecha cierre", ruta.fechaCierre],
    ["Tiendas visitadas", ruta.tiendas_visitadas || 0],
["Venta total", ruta.total_venta || 0],
["Cobrado", ruta.total_cobrado || 0],
["Pendiente", ruta.total_pendiente || 0],
  ];

  const contenido = [encabezados, ...filas, ...resumen]
    .map((fila) => fila.join(","))
    .join("\n");

  const archivo = new Blob([contenido], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(archivo);
  const link = document.createElement("a");

  link.href = url;
  link.download = `ruta-mi-tierra-${ruta.id}.csv`;
  link.click();

  URL.revokeObjectURL(url);
};
const exportarRutaPDF = (ruta) => {
  const doc = new jsPDF();

  doc.setFillColor(0, 122, 54);
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("Tortillería Mi Tierra", 14, 15);

  doc.setFontSize(12);
  doc.text("Reporte de ruta cerrada", 14, 25);

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(14);
  doc.text("Resumen de ruta", 14, 48);

  doc.setFontSize(11);
  doc.text(`Fecha cierre: ${ruta.fechaCierre}`, 14, 58);
  doc.text(`Tiendas visitadas: ${ruta.tiendas_visitadas || 0}`, 14, 66);
doc.text(`Venta total: ${formatoDinero(ruta.total_venta || 0)}`, 14, 74);
doc.text(`Cobrado: ${formatoDinero(ruta.total_cobrado || 0)}`, 14, 82);
doc.text(`Pendiente: ${formatoDinero(ruta.total_pendiente || 0)}`, 14, 90);

  autoTable(doc, {
    startY: 100,
    head: [[
      "Tienda",
      "Tortilla",
      "Dev.",
      "Masa",
      "Dev.",
      "Totopos",
      "Total",
      "Cobrado",
      "Pend."
    ]],
    body: ruta.registros.map((r) => [
      r.tienda,
      `${r.tortillaDejada || 0} kg`,
      `${r.tortillaDevuelta || 0} kg`,
      `${r.masaDejada || 0} kg`,
      `${r.masaDevuelta || 0} kg`,
      r.totoposDejados || 0,
      formatoDinero(r.totalVenta),
      formatoDinero(r.cobrado),
      formatoDinero(r.saldoPendiente),
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [0, 122, 54],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [240, 248, 243],
    },
    margin: { left: 8, right: 8 },
  });

  const fechaGeneracion = new Date().toLocaleString();

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Generado el ${fechaGeneracion} - Ruta Mi Tierra`,
    14,
    285
  );

  doc.save(`ruta-mi-tierra-${ruta.id}.pdf`);
};
  const formatoDinero = (cantidad) => {
    return Number(cantidad || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  };

  const tiendasFiltradas = tiendas.filter((tienda) =>
    tienda.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const tiendaSeleccionada =
    tiendas.find((t) => t.id === Number(tiendaId)) || tiendas[0];

  const ventaTortilla =
    Number(tortillaDejada || 0) - Number(tortillaDevuelta || 0);

  const ventaMasa =
    Number(masaDejada || 0) - Number(masaDevuelta || 0);

  const totalTortilla = ventaTortilla * tiendaSeleccionada.precioTortilla;
  const totalMasa = ventaMasa * tiendaSeleccionada.precioMasa;
  const totalTotopos =
    Number(totoposDejados || 0) * tiendaSeleccionada.precioTotopos;

  const totalVenta = totalTortilla + totalMasa + totalTotopos;
  const saldoPendiente = totalVenta - Number(cobrado || 0);

  const guardar = async () => {
    const nuevoRegistro = {
      tienda: tiendaSeleccionada.nombre,
      fecha: new Date().toLocaleString(),
      ventaTortilla,
      ventaMasa,
      tortillaDejada: Number(tortillaDejada || 0),
      tortillaDevuelta: Number(tortillaDevuelta || 0),
masaDejada: Number(masaDejada || 0),
masaDevuelta: Number(masaDevuelta || 0),
      totoposDejados: Number(totoposDejados || 0),
      totalTortilla,
      totalMasa,
      totalTotopos,
      totalVenta,
      cobrado: Number(cobrado || 0),
      saldoPendiente,
    };

    if (modoEdicion && editandoIndex !== null) {
  const registroOriginal = registros[editandoIndex];

const { error } = await supabase
  .from("entregas")
  .update({
    tienda: nuevoRegistro.tienda,
    tortilla_dejada: nuevoRegistro.tortillaDejada,
    tortilla_devuelta: nuevoRegistro.tortillaDevuelta,
    masa_dejada: nuevoRegistro.masaDejada,
    masa_devuelta: nuevoRegistro.masaDevuelta,
    totopos_dejados: nuevoRegistro.totoposDejados,
    total_venta: nuevoRegistro.totalVenta,
    cobrado: nuevoRegistro.cobrado,
    saldo_pendiente: nuevoRegistro.saldoPendiente,
  })
  .eq("id", registroOriginal.id);

if (error) {
  alert("Error al editar: " + error.message);
  return;
}

await cargarEntregas();

  setModoEdicion(false);
  setEditandoIndex(null);
} else {
  const { error } = await supabase.from("entregas").insert({
    usuario_id: usuario.id,
    tienda: nuevoRegistro.tienda,
    tortilla_dejada: nuevoRegistro.tortillaDejada,
    tortilla_devuelta: nuevoRegistro.tortillaDevuelta,
    masa_dejada: nuevoRegistro.masaDejada,
    masa_devuelta: nuevoRegistro.masaDevuelta,
    totopos_dejados: nuevoRegistro.totoposDejados,
    total_venta: nuevoRegistro.totalVenta,
    cobrado: nuevoRegistro.cobrado,
    saldo_pendiente: nuevoRegistro.saldoPendiente,
    creada_por_nombre: perfil?.nombre || usuario?.email || "",
  });

  if (error) {
    alert("Error al guardar: " + error.message);
    return;
  }

  await cargarEntregas();
}

    setTortillaDejada("");
    setTortillaDevuelta("");
    setMasaDejada("");
    setMasaDevuelta("");
    setTotoposDejados("");
    setCobrado("");
    setBusqueda("");
  };

  const totalDia = registros.reduce((sum, r) => sum + r.totalVenta, 0);
  const cobradoDia = registros.reduce((sum, r) => sum + r.cobrado, 0);
  const pendienteDia = registros.reduce((sum, r) => sum + r.saldoPendiente, 0);
const tortillaEntregadaDia = registros.reduce(
  (sum, r) => sum + Number(r.tortillaDejada || 0),
  0
);

const masaEntregadaDia = registros.reduce(
  (sum, r) => sum + Number(r.masaDejada || 0),
  0
);

const totoposVendidosDia = registros.reduce(
  (sum, r) => sum + Number(r.totoposDejados || 0),
  0
);

const tortillaRestante =
  Number(inventario.tortillaInicial || 0) - tortillaEntregadaDia;

const masaRestante =
  Number(inventario.masaInicial || 0) - masaEntregadaDia;

const totoposRestantes =
  Number(inventario.totoposInicial || 0) - totoposVendidosDia;
  if (mostrarBienvenida) {
  return (
    <div className="splash">
     <div className="splash-logo">
  <img src={logoRutas} alt="Sistema de Rutas" />
</div>
      <h1>Sistema de Rutas</h1>
      <p>Para Tortillería</p>
      <div className="loader"></div>
    </div>
  );
}
const cargarPerfil = async (userId) => {
  const { data, error } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.log("Error perfil:", error.message);
    setPerfil(null);
    return;
  }
console.log("PERFIL CARGADO:", data);
  setPerfil(data);
};

const cargarEntregas = async () => {
  const { data, error } = await supabase
  .from("entregas")
  .select("*")
  .eq("ruta_cerrada", false)
  .order("fecha", { ascending: false });

  if (error) {
    alert("Error al cargar entregas: " + error.message);
    return;
  }

  const entregasConvertidas = data.map((e) => ({
    id: e.id,
    tienda: e.tienda,
    fecha: new Date(e.fecha).toLocaleString(),
    tortillaDejada: e.tortilla_dejada,
    tortillaDevuelta: e.tortilla_devuelta,
    masaDejada: e.masa_dejada,
    masaDevuelta: e.masa_devuelta,
    totoposDejados: e.totopos_dejados,
    totalVenta: e.total_venta,
    cobrado: e.cobrado,
    saldoPendiente: e.saldo_pendiente,
    creadaPorNombre: e.creada_por_nombre,
    rutaCerrada: e.ruta_cerrada,
  }));

  setRegistros(entregasConvertidas);
};

const cargarRutasCerradas = async () => {
  const { data, error } = await supabase
    .from("rutas_cerradas")
    .select("*")
    .order("fecha", { ascending: false });

  if (error) {
    alert("Error al cargar rutas cerradas: " + error.message);
    return;
  }



  setRutasCerradas(data || []);
};

const registrarEmpleado = async () => {
  if (!registroNombre || !registroEmail || !registroPassword) {
    alert("Completa nombre, correo y contraseña");
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email: registroEmail,
    password: registroPassword,
  });

  if (error) {
    alert("No se pudo registrar: " + error.message);
    return;
  }

  if (data.user) {
    const { error: perfilError } = await supabase.from("perfiles").insert({
      id: data.user.id,
      nombre: registroNombre,
      rol: "repartidor",
    });

    if (perfilError) {
      alert("Usuario creado, pero falló el perfil: " + perfilError.message);
      return;
    }
  }

  alert("Empleado registrado como repartidor");
  setMostrarRegistro(false);
  setRegistroNombre("");
  setRegistroEmail("");
  setRegistroPassword("");
};
const iniciarSesion = async () => {
  if (!loginEmail || !loginPassword) {
    alert("Escribe correo y contraseña");
    return;
  }

  setCargandoLogin(true);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password: loginPassword,
  });

  if (error) {
    setCargandoLogin(false);
    alert("No se pudo iniciar sesión: " + error.message);
    return;
  }

  if (data.user) {
    await cargarPerfil(data.user.id);
  }

  setCargandoLogin(false);
};

const cerrarSesion = async () => {
  await supabase.auth.signOut();
  setUsuario(null);
};

if (!usuario) {
  return (
    <div className="app">
      <div className="card">
        <h2>🔐 Iniciar sesión</h2>

        <label>Correo</label>
        <input
          type="email"
          placeholder="correo@ejemplo.com"
          value={loginEmail}
          onChange={(e) => setLoginEmail(e.target.value)}
        />

        <label>Contraseña</label>
        <input
          type="password"
          placeholder="Contraseña"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
        />

        <button onClick={iniciarSesion}>
          Entrar al sistema
        </button>
      </div>
    </div>
  );
}
const esDueno =
  perfil?.rol === "dueno" ||
  usuario?.email === "miguel71294@gmail.com";
  return (
    <div className="app">
      <h1>Ruta Mi Tierra</h1>

      <div className="menu">
        <button onClick={() => setPantalla("entrega")}>Nueva entrega</button>

<button
  onClick={async () => {
    await cargarEntregas();
    setPantalla("historial");
  }}
>
  Historial
</button>

{esDueno && (
  <button onClick={() => setPantalla("corte")}>Corte del día</button>
)}

{esDueno && (
  <button onClick={() => setPantalla("inventario")}>Inventario</button>
)}

{esDueno && (
  <button
  style={{ background: "red", color: "white" }}
  onClick={async () => {

    await cargarRutasCerradas();
    setPantalla("rutasCerradas");
  }}
>
  Rutas cerradas
</button>
)}

{esDueno && (
  <button onClick={() => setPantalla("administracion")}>
    Administración
  </button>
)}

<button onClick={cerrarSesion}>Cerrar sesión</button>

      </div>

      {pantalla === "entrega" && (
        <div className="card">
          <h2>Nueva entrega</h2>

          <label>Buscar tienda</label>
          <input
            placeholder="Ej. Coto, Mary, Chino..."
            value={busqueda}
            onChange={(e) => {
              const texto = e.target.value;
              setBusqueda(texto);

              const resultado = tiendas.find((tienda) =>
                tienda.nombre.toLowerCase().includes(texto.toLowerCase())
              );

              if (resultado) {
                setTiendaId(resultado.id);
              }
            }}
          />

          <label>Tienda</label>
          <select value={tiendaId} onChange={(e) => setTiendaId(e.target.value)}>
            {tiendasFiltradas.map((tienda) => (
              <option key={tienda.id} value={tienda.id}>
                {tienda.nombre}
              </option>
            ))}
          </select>

          <div className="resumen">
            <p>Tortilla: {formatoDinero(tiendaSeleccionada.precioTortilla)} / kg</p>
            <p>Masa: {formatoDinero(tiendaSeleccionada.precioMasa)} / kg</p>
            <p>Totopos: {formatoDinero(tiendaSeleccionada.precioTotopos)} / bolsa</p>
          </div>

          <h3>Tortilla</h3>
          <label>Kg dejados</label>
          <input type="number" value={tortillaDejada} onChange={(e) => setTortillaDejada(e.target.value)} />

          <label>Kg devueltos</label>
          <input type="number" value={tortillaDevuelta} onChange={(e) => setTortillaDevuelta(e.target.value)} />

          <h3>Masa</h3>
          <label>Kg dejados</label>
          <input type="number" value={masaDejada} onChange={(e) => setMasaDejada(e.target.value)} />

          <label>Kg devueltos</label>
          <input type="number" value={masaDevuelta} onChange={(e) => setMasaDevuelta(e.target.value)} />

          <h3>Totopos</h3>
          <label>Bolsas dejadas</label>
          <input type="number" value={totoposDejados} onChange={(e) => setTotoposDejados(e.target.value)} />

          <div className="resumen">
            <h3>Resumen automático</h3>
            <p>Tortilla: {ventaTortilla} kg = {formatoDinero(totalTortilla)}</p>
            <p>Masa: {ventaMasa} kg = {formatoDinero(totalMasa)}</p>
            <p>Totopos: {totoposDejados || 0} = {formatoDinero(totalTotopos)}</p>
          </div>

          <div className="total-cobrar">
            TOTAL A COBRAR
            <br />
            {formatoDinero(totalVenta)}
          </div>

          <label>Dinero cobrado en efectivo</label>
          <input type="number" value={cobrado} onChange={(e) => setCobrado(e.target.value)} />

          <div className={saldoPendiente <= 0 ? "pagado" : "pendiente"}>
            {saldoPendiente <= 0 ? "PAGADO COMPLETO" : "PENDIENTE"}
            <br />
            {formatoDinero(saldoPendiente)}
          </div>

          <button onClick={guardar}>Guardar y continuar</button>
        </div>
      )}

      {pantalla === "historial" && (
        <div className="card">
          <h2>Historial del día</h2>

          {registros.length === 0 && <p>No hay entregas registradas.</p>}

          {registros.map((r, index) => (
            <div className="registro" key={index}>
              <strong>{r.tienda}</strong>
              <p>{r.fecha}</p>
              <p>Tortilla: {formatoDinero(r.totalTortilla)}</p>
              <p>Tortilla devuelta: {r.tortillaDevuelta || 0} kg</p>
              <p>Masa: {formatoDinero(r.totalMasa)}</p>
              <p>Masa devuelta: {r.masaDevuelta || 0} kg</p>
              <p>Totopos: {formatoDinero(r.totalTotopos)}</p>
              <h3>Total: {formatoDinero(r.totalVenta)}</h3>
              <p>Cobrado: {formatoDinero(r.cobrado)}</p>
              <p>Pendiente: {formatoDinero(r.saldoPendiente)}</p>
         <button onClick={() => editarRegistro(r, index)}>
  ✏️ Editar
</button>
              {esDueno && (
  <button onClick={() => borrarRegistro(index)}>
    🗑️ Borrar registro
  </button>
)}
            </div>
          ))}
        </div>
      )}

      {pantalla === "corte" && (
        <div className="card">
          <h2>Corte del día</h2>
          <p>Tiendas visitadas: {registros.length}</p>
          <h3>Venta total: {formatoDinero(totalDia)}</h3>
          <h3>Dinero cobrado: {formatoDinero(cobradoDia)}</h3>
          <h3>Saldo pendiente: {formatoDinero(pendienteDia)}</h3>
          <button onClick={iniciarRutaNueva}>
  Iniciar ruta nueva
</button>
        </div>
      )}

{pantalla === "inventario" && (
  <div className="card">
    <h2>Inventario de ruta</h2>

    <label>Tortilla cargada kg</label>
    <input
      type="number"
      value={inventario.tortillaInicial}
      onChange={(e) =>
        setInventario({
          ...inventario,
          tortillaInicial: e.target.value,
        })
      }
    />

    <label>Masa cargada kg</label>
    <input
      type="number"
      value={inventario.masaInicial}
      onChange={(e) =>
        setInventario({
          ...inventario,
          masaInicial: e.target.value,
        })
      }
    />

    <label>Totopos cargados</label>
    <input
      type="number"
      value={inventario.totoposInicial}
      onChange={(e) =>
        setInventario({
          ...inventario,
          totoposInicial: e.target.value,
        })
      }
    />
    
    <div className="resumen">
  <h3>Inventario actual</h3>

  <p>Tortilla cargada: {inventario.tortillaInicial || 0} kg</p>
  <p>Tortilla entregada: {tortillaEntregadaDia} kg</p>
  <h3>Tortilla restante: {tortillaRestante} kg</h3>

  <p>Masa cargada: {inventario.masaInicial || 0} kg</p>
  <p>Masa entregada: {masaEntregadaDia} kg</p>
  <h3>Masa restante: {masaRestante} kg</h3>

  <p>Totopos cargados: {inventario.totoposInicial || 0}</p>
  <p>Totopos vendidos: {totoposVendidosDia}</p>
  <h3>Totopos restantes: {totoposRestantes}</h3>
</div>
  </div>
)}
{pantalla === "rutasCerradas" && (
  <div className="card">
    <h2>Rutas cerradas</h2>

    {rutasCerradas.length === 0 ? (
      <p>No hay rutas guardadas.</p>
    ) : (
      rutasCerradas.map((ruta) => (
      <div
  key={ruta.id}
  onClick={() => {
  setRutaSeleccionada(ruta);
  setPantalla("detalleRuta");
}}
  style={{
            border: "1px solid #ddd",
            borderRadius: "10px",
            padding: "10px",
            marginBottom: "10px",
          }}
        >
          <h3>{ruta.fechaCierre}</h3>
          <p>Venta: {formatoDinero(ruta.total_venta || 0)}</p>
<p>Cobrado: {formatoDinero(ruta.total_cobrado || 0)}</p>
<p>Pendiente: {formatoDinero(ruta.total_pendiente || 0)}</p>
          {esDueno && (
  <button onClick={() => exportarRutaPDF(ruta)}>
    📄 Exportar PDF
  </button>
)}

{esDueno && (
  <button onClick={() => borrarRutaCerrada(ruta.id)}>
    🗑️ Borrar
  </button>
)}
        </div>
      ))
    )}
  </div>
)}
{pantalla === "detalleRuta" && rutaSeleccionada && (
  <div className="card">
    <button
      onClick={() => {
        setRutaSeleccionada(null);
        setPantalla("rutasCerradas");
      }}
    >
      ← Regresar
    </button>

    <h2>Detalle de la ruta</h2>

    <p><strong>Fecha:</strong> {rutaSeleccionada.fechaCierre}</p>
    <p><strong>Tiendas:</strong> {rutaSeleccionada.resumen.tiendasVisitadas}</p>
    <p><strong>Venta total:</strong> {formatoDinero(rutaSeleccionada.resumen.ventaTotal)}</p>
    <p><strong>Cobrado:</strong> {formatoDinero(rutaSeleccionada.resumen.dineroCobrado)}</p>
    <p><strong>Pendiente:</strong> {formatoDinero(rutaSeleccionada.resumen.saldoPendiente)}</p>

    <hr />

    {rutaSeleccionada.registros.map((r, index) => (
      <div
        key={index}
        style={{
          border: "1px solid #ddd",
          borderRadius: "10px",
          padding: "10px",
          marginBottom: "10px",
        }}
      >
        <h3>{r.tienda}</h3>

        <p>Fecha: {r.fecha}</p>

        <p>Tortilla dejada: {r.tortillaDejada} kg</p>
        <p>Tortilla devuelta: {r.tortillaDevuelta} kg</p>

        <p>Masa dejada: {r.masaDejada} kg</p>
        <p>Masa devuelta: {r.masaDevuelta} kg</p>

        <p>Totopos: {r.totoposDejados}</p>

        <p>Total venta: {formatoDinero(r.totalVenta)}</p>
        <p>Cobrado: {formatoDinero(r.cobrado)}</p>
        <p>Pendiente: {formatoDinero(r.saldoPendiente)}</p>
      </div>
    ))}
  </div>
)}
{pantalla === "administracion" && esDueno && (
  <div className="card">
    <h2>👤 Administración de empleados</h2>

    <label>Nombre del empleado</label>
    <input
      type="text"
      value={registroNombre}
      onChange={(e) => setRegistroNombre(e.target.value)}
      placeholder="Ej. Juan Pérez"
    />

    <label>Correo electrónico</label>
    <input
      type="email"
      value={registroEmail}
      onChange={(e) => setRegistroEmail(e.target.value)}
      placeholder="empleado@correo.com"
    />

    <label>Contraseña</label>
    <input
      type="password"
      value={registroPassword}
      onChange={(e) => setRegistroPassword(e.target.value)}
      placeholder="Contraseña"
    />

    <button onClick={registrarEmpleado}>
      ➕ Registrar empleado
    </button>
  </div>
)}
    </div>
  );
}

export default App;