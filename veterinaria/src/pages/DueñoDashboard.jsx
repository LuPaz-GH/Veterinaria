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

const formatearFecha = (fechaISO) => {
    if (!fechaISO) return "";
    return fechaISO.split("T")[0].split("-").reverse().join("/");
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const entry = payload[0].payload || {};
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
    const [chartDimensions, setChartDimensions] = useState({
        width: 800,
        height: 350
    });
    const dashboardRef = useRef(null);

    // Actualizar dimensiones de gráficos al montar y redimensionar
    useEffect(() => {
        const updateDimensions = () => {
            if (dashboardRef.current) {
                const { width } = dashboardRef.current.getBoundingClientRect();
                setChartDimensions({
                    width: Math.max(width - 32, 300), // Mínimo 300px
                    height: 350
                });
            }
        };

        // Ejecutar después de un pequeño delay para asegurar que el DOM está listo
        const timer = setTimeout(updateDimensions, 100);
        
        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateDimensions);
        };
    }, []);

    const fetchDatos = async () => {
        try {
            const res = await api.get('/dashboard-reportes');
            const data = res.data;

            const turnosNormalizados = (data.graficoTurnos || []).map(item => ({
                name: item.name || item.tipo || item.servicio || 'Sin nombre',
                value: Number(item.value || 0)
            }));

            const needsFallback =
                !data ||
                !Array.isArray(data.graficoVentas) || data.graficoVentas.length === 0 ||
                !Array.isArray(turnosNormalizados) || turnosNormalizados.length === 0;

            if (needsFallback) throw new Error("Datos incompletos");

            setReporte({
                ...data,
                graficoTurnos: turnosNormalizados
            });
        } catch (error) {
            console.warn('⚠️ Usando datos de fallback para dashboard:', error.message);
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
        XLSX.writeFile(wb, `Reporte_Malfi_${new Date().toLocaleDateString()}.xlsx`);
    };

    const exportarPDF = async () => {
        const element = dashboardRef.current;
        if (!element) return;
        try {
            const canvas = await html2canvas(element, { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: "#2e144b",
                logging: false 
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Reporte_Malfi_Completo.pdf`);
        } catch (err) {
            console.error('Error exportando PDF:', err);
            alert('No se pudo generar el PDF. Intentá de nuevo.');
        }
    };

    const COLORS = ['#663399', '#ff69b4', '#00bfff', '#99cc33', '#ffa500'];

    const glassStyle = {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(15px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '24px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
    };

    if (loading) {
        return (
            <div className="container-fluid p-4" style={{ minHeight: '400px' }}>
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                    <div className="spinner-border text-light" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                    <span className="ms-3 text-white fw-bold">Cargando reportes...</span>
                </div>
            </div>
        );
    }

    const graficoVentasFormateado = (reporte?.graficoVentas || []).map(item => ({
        ...item,
        dia: item.dia?.includes("T") ? formatearFecha(item.dia) : item.dia
    }));

    return (
        <div ref={dashboardRef} className="container-fluid p-4">
            <div className="position-relative">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                    <div className="text-white text-start">
                        <h2 className="fw-bold mb-0">Panel de reportes</h2>
                        <p className="opacity-75 fw-bold mb-0 small">Malfi Veterinaria • Tucumán</p>
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-success btn-sm rounded-pill px-3 fw-bold shadow border-0" onClick={exportarExcel}>
                            <FontAwesomeIcon icon={faFileExcel} className="me-2" /> EXCEL
                        </button>
                        <button className="btn btn-danger btn-sm rounded-pill px-3 fw-bold shadow border-0" onClick={exportarPDF}>
                            <FontAwesomeIcon icon={faFilePdf} className="me-2" /> PDF
                        </button>
                    </div>
                </div>

                <div className="row g-3 mb-4">
                    {[
                        { label: 'VENTA HOY', val: reporte?.totales?.dia || 0, icon: faCoins },
                        { label: 'ESTA SEMANA', val: reporte?.totales?.semana || 0, icon: faCalendarWeek },
                        { label: 'MES ACTUAL', val: reporte?.totales?.mes || 0, icon: faCalendarDay },
                        { label: 'VENTA AÑO', val: reporte?.totales?.anio || 0, icon: faCalendarAlt }
                    ].map((item, idx) => (
                        <div className="col-6 col-lg-3" key={idx}>
                            <div className="p-3 text-center text-white" style={glassStyle}>
                                <FontAwesomeIcon icon={item.icon} className="mb-2" style={{ fontSize: '1.5rem', opacity: 0.8 }} />
                                <small className="fw-bold opacity-75 d-block mb-1" style={{fontSize: '0.7rem'}}>{item.label}</small>
                                <h4 className="fw-bold mb-0" style={{fontSize: '1.2rem'}}>${Number(item.val).toLocaleString('es-AR')}</h4>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="row g-4">
                    <div className="col-12">
                        <div className="p-4" style={glassStyle}>
                            <h5 className="text-white fw-bold mb-4 text-start">
                                <FontAwesomeIcon icon={faArrowTrendUp} className="me-2 text-success" /> Evolución de Ventas
                            </h5>
                            <div style={{ width: '100%', height: '350px' }}>
                                <ResponsiveContainer width="100%" height={350} minWidth={300}>
                                    <BarChart data={graficoVentasFormateado} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                        <XAxis dataKey="dia" stroke="#fff" tick={{ fontSize: 12, fill: '#fff' }} />
                                        <YAxis stroke="#fff" tick={{ fontSize: 12, fill: '#fff' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="total" fill="#99cc33" radius={[10, 10, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-xl-6">
                        <div className="p-4 h-100" style={glassStyle}>
                            <h5 className="text-white fw-bold mb-4">Distribución de Servicios</h5>
                            <div style={{ width: '100%', height: '300px', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#fff', zIndex: 1 }}>
                                    <h3 className="fw-bold mb-0">{(reporte?.graficoTurnos || []).reduce((acc, curr) => acc + (curr?.value || 0), 0)}</h3>
                                    <small className="fw-bold opacity-75">SERVICIOS</small>
                                </div>
                                <ResponsiveContainer width="100%" height={300} minWidth={250}>
                                    <PieChart>
                                        <Pie
                                            data={reporte?.graficoTurnos || []}
                                            dataKey="value"
                                            innerRadius={70}
                                            outerRadius={100}
                                            stroke="none"
                                            paddingAngle={5}
                                        >
                                            {(reporte?.graficoTurnos || []).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ color: '#fff', fontSize: '12px', paddingTop: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-xl-6">
                        <div className="p-4 h-100" style={glassStyle}>
                            <h5 className="text-white fw-bold mb-4">Tendencia Mensual</h5>
                            <div style={{ width: '100%', height: '300px' }}>
                                <ResponsiveContainer width="100%" height={300} minWidth={300}>
                                    <LineChart data={reporte?.tendenciaMensual || []} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="mes" stroke="#fff" tick={{ fontSize: 12 }} />
                                        <YAxis stroke="#fff" tick={{ fontSize: 12 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Line type="monotone" dataKey="monto" stroke="#00d4ff" strokeWidth={3} dot={{ r: 4, fill: '#00d4ff' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DueñoDashboard;