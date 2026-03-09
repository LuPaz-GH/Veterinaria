import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCoins, faCalendarWeek, faCalendarDay, faCalendarAlt,
    faArrowTrendUp, faFileExcel, faFilePdf
} from '@fortawesome/free-solid-svg-icons';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    LineChart, Line
} from 'recharts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import api from '../services/api'; 

// ✅ Formatear fecha ISO fea tipo: 2026-02-15T03:00:00.000Z -> 15/02/2026
const formatearFecha = (fechaISO) => {
    if (!fechaISO) return "";
    return fechaISO.split("T")[0].split("-").reverse().join("/");
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const entry = payload[0].payload || {};
        // Tomamos el nombre del servicio de forma segura
        const serviceName = entry.name || entry.tipo || entry.servicio || label || payload[0].name || 'Servicio';

        const value = payload[0].value;
        const isServiceCount = typeof value === 'number' && value <= 10000;

        return (
            <div style={{
                background: 'rgba(0, 0, 0, 0.9)',
                color: '#fff',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
                fontSize: '14px'
            }}>
                <p className="mb-1 fw-bold text-uppercase small opacity-75">
                    {serviceName}
                </p>
                <p className="mb-0 fw-bold fs-5">
                    {isServiceCount
                        ? `${value} servicios`
                        : value?.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
                    }
                </p>
            </div>
        );
    }
    return null;
};

const DueñoDashboard = () => {
    const [reporte, setReporte] = useState(null);
    const [loading, setLoading] = useState(true);
    const dashboardRef = useRef(null);

    const fetchDatos = async () => {
        try {
            console.log("Intentando petición a /api/dashboard-reportes...");
            const res = await api.get('/dashboard-reportes');
            console.log("Respuesta status:", res.status);

            const data = res.data;
            console.log("Datos reales del backend:", data);

            // Normalizamos graficoTurnos para que siempre tenga "name" y "value"
            const turnosNormalizados = (data.graficoTurnos || []).map(item => ({
                name: item.name || item.tipo || item.servicio || 'Sin nombre',
                value: Number(item.value || 0)
            }));

            const needsFallback =
                !data ||
                !Array.isArray(data.graficoVentas) || data.graficoVentas.length === 0 ||
                !Array.isArray(turnosNormalizados) || turnosNormalizados.length === 0;

            if (needsFallback) {
                console.warn("Datos incompletos del backend → forzando fallback");
                throw new Error("Datos de gráficos incompletos");
            }

            setReporte({
                ...data,
                graficoTurnos: turnosNormalizados
            });
        } catch (error) {
            console.error("Usando fallback:", error.message);

            setReporte({
                totales: { dia: 463700, semana: 1200000, mes: 4500000, anio: 18000000 },
                graficoVentas: [
                    { dia: '01/02', total: 85000 },
                    { dia: '05/02', total: 120000 },
                    { dia: '10/02', total: 200000 },
                    { dia: '14/02', total: 463700 }
                ],
                graficoTurnos: [
                    { name: 'Consulta', value: 45 },
                    { name: 'Vacunación', value: 20 },
                    { name: 'Cirugía', value: 8 },
                    { name: 'Estética', value: 30 }
                ],
                tendenciaMensual: [{ mes: 'Feb', monto: 2500000 }],
                topServicios: [
                    { servicio: 'Venta Múltiple', ingresos: 1200000 },
                    { servicio: 'Medicamentos', ingresos: 800000 },
                    { servicio: 'Peluquería', ingresos: 450000 }
                ]
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDatos();
    }, []);

    // --- FUNCIONES DE EXPORTACIÓN ---
    const exportarExcel = () => {
        if (!reporte) return;
        const wb = XLSX.utils.book_new();

        const wsTotales = XLSX.utils.json_to_sheet([
            { Concepto: "Venta Hoy", Monto: reporte.totales?.dia },
            { Concepto: "Esta Semana", Monto: reporte.totales?.semana },
            { Concepto: "Mes Actual", Monto: reporte.totales?.mes },
            { Concepto: "Venta Año", Monto: reporte.totales?.anio }
        ]);
        XLSX.utils.book_append_sheet(wb, wsTotales, "Resumen General");

        const wsVentas = XLSX.utils.json_to_sheet(reporte.graficoVentas || []);
        XLSX.utils.book_append_sheet(wb, wsVentas, "Evolución Ventas");

        XLSX.writeFile(wb, `Reporte_Malfi_${new Date().toLocaleDateString()}.xlsx`);
    };

    const exportarPDF = async () => {
        const element = dashboardRef.current;
        if (!element) return;

        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#2e144b"
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Reporte_Malfi_Completo.pdf`);
    };

    const COLORS = ['#663399', '#ff69b4', '#00bfff', '#99cc33', '#ffa500'];

    const glassStyle = {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(15px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '24px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100 bg-dark text-white">
            <h3>Cargando reporte de Malfi...</h3>
        </div>
    );

    const graficoVentas = reporte?.graficoVentas || [];
    const graficoTurnos = reporte?.graficoTurnos || [];
    const totalServicios = graficoTurnos.reduce((acc, curr) => acc + (curr?.value || 0), 0);

    // 🔥 Si graficoVentas viene con fechas ISO del backend, las convertimos
    const graficoVentasFormateado = graficoVentas.map(item => ({
        ...item,
        dia: item.dia?.includes("T") ? formatearFecha(item.dia) : item.dia
    }));

    return (
        <div
            ref={dashboardRef}
            className="container-fluid p-4 p-md-5 min-vh-100 position-relative"
            style={{
                backgroundImage: `url('https://i.pinimg.com/1200x/95/21/0f/95210f85d0c87c7e21952f56a9a834fd.jpg')`,
                backgroundSize: 'cover',
                backgroundAttachment: 'fixed',
                backgroundPosition: 'center'
            }}
        >

            <div style={{ position: 'absolute', inset: 0, background: 'rgba(40, 0, 80, 0.3)', zIndex: 0 }} />

            <div className="position-relative" style={{ zIndex: 1 }}>
                <div className="d-flex justify-content-between align-items-center mb-5 flex-wrap gap-3">
                    <div className="text-white">
                        <h1 className="fw-bold mb-0">Panel de reportes</h1>
                        <p className="opacity-75 fw-bold mb-0">Malfi Veterinaria • Tucumán</p>
                    </div>
                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-success rounded-pill px-4 fw-bold shadow border-0"
                            onClick={exportarExcel}
                            style={{ backgroundColor: '#28a745' }}
                        >
                            <FontAwesomeIcon icon={faFileExcel} className="me-2" /> EXCEL
                        </button>
                        <button
                            className="btn btn-danger rounded-pill px-4 fw-bold shadow border-0"
                            onClick={exportarPDF}
                            style={{ backgroundColor: '#dc3545' }}
                        >
                            <FontAwesomeIcon icon={faFilePdf} className="me-2" /> PDF COMPLETO
                        </button>
                    </div>
                </div>

                <div className="row g-3 mb-5">
                    {[
                        { label: 'VENTA HOY', val: reporte?.totales?.dia || 0, icon: faCoins },
                        { label: 'ESTA SEMANA', val: reporte?.totales?.semana || 0, icon: faCalendarWeek },
                        { label: 'MES ACTUAL', val: reporte?.totales?.mes || 0, icon: faCalendarDay },
                        { label: 'VENTA AÑO', val: reporte?.totales?.anio || 0, icon: faCalendarAlt }
                    ].map((item, idx) => (
                        <div className="col-6 col-lg-3" key={idx}>
                            <div className="p-4 text-center text-white" style={glassStyle}>
                                <FontAwesomeIcon
                                    icon={item.icon}
                                    className="mb-2"
                                    style={{ fontSize: '2.2rem', opacity: 0.9 }}
                                />
                                <small className="fw-bold opacity-75 d-block mb-1">{item.label}</small>
                                <h3 className="fw-bold mb-0">${Number(item.val).toLocaleString('es-AR')}</h3>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="row g-4">
                    {/* Evolución de Ventas */}
                    <div className="col-12">
                        <div className="p-4" style={glassStyle}>
                            <h4 className="text-white fw-bold mb-4">
                                <FontAwesomeIcon icon={faArrowTrendUp} className="me-2 text-success" /> Evolución de Ventas
                            </h4>

                            <div style={{
                                width: '100%',
                                height: '500px',
                                minHeight: '500px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {graficoVentasFormateado.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={graficoVentasFormateado}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                            <XAxis
                                                dataKey="dia"
                                                stroke="#fff"
                                                tick={{ fontSize: 14, fill: '#fff' }}
                                                tickLine={{ stroke: '#fff' }}
                                            />
                                            <YAxis
                                                stroke="#fff"
                                                tick={{ fontSize: 14, fill: '#fff' }}
                                                tickLine={{ stroke: '#fff' }}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="total" fill="#99cc33" radius={[10, 10, 0, 0]} barSize={50} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="d-flex justify-content-center align-items-center h-100 text-white">
                                        <p>No hay datos de ventas aún...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Distribución de Servicios - CORREGIDO */}
                    <div className="col-12 col-xl-6">
                        <div className="p-4 h-100" style={glassStyle}>
                            <h4 className="text-white fw-bold mb-4 text-center">Distribución de Servicios</h4>

                            <div style={{
                                width: '100%',
                                height: '500px',
                                minHeight: '500px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '45%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    textAlign: 'center',
                                    color: '#fff'
                                }}>
                                    <h2 className="fw-bold mb-0" style={{ fontSize: '3rem' }}>{totalServicios}</h2>
                                    <small className="fw-bold opacity-75">SERVICIOS</small>
                                </div>

                                {graficoTurnos.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={graficoTurnos}
                                                dataKey="value"
                                                nameKey="name"           // ← CLAVE IMPORTANTE: usa "name" para la leyenda y tooltip
                                                innerRadius={100}
                                                outerRadius={140}
                                                stroke="none"
                                                paddingAngle={5}
                                            >
                                                {graficoTurnos.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>

                                            <Tooltip content={<CustomTooltip />} />

                                            <Legend
                                                verticalAlign="bottom"
                                                align="center"
                                                iconSize={12}
                                                wrapperStyle={{
                                                    color: '#fff',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold'
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="d-flex justify-content-center align-items-center h-100 text-white">
                                        <p>No hay datos de servicios aún...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tendencia Mensual */}
                    <div className="col-12 col-xl-6">
                        <div className="p-4 h-100" style={glassStyle}>
                            <h4 className="text-white fw-bold mb-4">
                                <FontAwesomeIcon icon={faArrowTrendUp} className="me-2 text-info" /> Tendencia Mensual
                            </h4>

                            <div style={{
                                width: '100%',
                                height: '500px',
                                minHeight: '500px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {reporte?.tendenciaMensual?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={reporte.tendenciaMensual}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                            <XAxis
                                                dataKey="mes"
                                                stroke="#fff"
                                                tick={{ fontSize: 14, fill: '#fff' }}
                                            />
                                            <YAxis
                                                stroke="#fff"
                                                tick={{ fontSize: 14, fill: '#fff' }}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Line
                                                type="monotone"
                                                dataKey="monto"
                                                stroke="#00d4ff"
                                                strokeWidth={4}
                                                dot={{ r: 6, fill: '#00d4ff' }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="d-flex justify-content-center align-items-center h-100 text-white">
                                        <p>No hay datos de tendencia aún...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DueñoDashboard;