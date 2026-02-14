import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCoins, faCalendarWeek, faCalendarDay, faCalendarAlt,
    faArrowTrendUp, faChartBar, faTrophy, faFileExcel, faFilePdf
} from '@fortawesome/free-solid-svg-icons';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

// Librerías
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(0, 0, 0, 0.9)',
                color: '#fff',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
                fontSize: '15px'
            }}>
                <p className="mb-1 fw-bold text-uppercase small opacity-75">{label || payload[0].name}</p>
                <p className="mb-0 fw-bold fs-5">
                    {payload[0].value?.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
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
            const res = await fetch('http://localhost:3001/api/dashboard-reportes');
            const data = await res.json();
            setReporte(data);
        } catch (error) {
            console.error("Error:", error);
            setReporte({
                totales: { dia: 188000, semana: 1080804, mes: 1080804, anio: 1080804 },
                graficoVentas: [{ dia: '12/02', total: 850000 }, { dia: '13/02', total: 123004 }],
                graficoTurnos: [{ name: 'Consulta', value: 40 }, { name: 'Vacunación', value: 15 }, { name: 'Cirugía', value: 5 }, { name: 'Estética', value: 24 }],
                tendenciaMensual: [{ mes: 'Feb', monto: 1200000 }],
                topServicios: [{ servicio: 'Venta Múltiple', ingresos: 580000 }, { servicio: 'Medicamentos', ingresos: 520000 }, { servicio: 'Peluquería', ingresos: 45000 }]
            });
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchDatos(); }, []);

    const exportarExcel = () => {
        if (!reporte) return;
        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.json_to_sheet([{ HOY: reporte.totales.dia, SEMANA: reporte.totales.semana, MES: reporte.totales.mes, AÑO: reporte.totales.anio }]);
        XLSX.utils.book_append_sheet(wb, ws1, "Resumen");
        const ws2 = XLSX.utils.json_to_sheet(reporte.graficoVentas);
        XLSX.utils.book_append_sheet(wb, ws2, "Ventas");
        XLSX.writeFile(wb, `Malfi_Reporte_${new Date().toLocaleDateString()}.xlsx`);
    };

    // --- FUNCIÓN PDF MEJORADA (Captura sin cortes) ---
    const exportarPDF = async () => {
        const element = dashboardRef.current;
        if (!element) return;

        // Forzamos al elemento a mostrar todo su contenido antes de la captura
        const canvas = await html2canvas(element, {
            scale: 2, // Calidad alta
            useCORS: true,
            logging: false,
            backgroundColor: "#4a148c",
            // Estas dos líneas son las que arreglan el corte:
            scrollY: -window.scrollY, 
            windowHeight: element.scrollHeight 
        });
        
        const imgData = canvas.toDataURL('image/png');
        const doc = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        // Si la imagen es muy larga, creamos un PDF con el alto necesario
        // O lo ajustamos a una sola página larga (mejor para ver en PC)
        const customDoc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: [pdfWidth, pdfHeight]
        });

        customDoc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        customDoc.save(`Reporte_Malfi_Completo.pdf`);
    };

    const COLORS = ['#663399', '#ff69b4', '#00bfff', '#99cc33', '#ffa500'];
    const glassStyle = {
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)'
    };

    if (loading) return <div className="text-center p-5 text-white fs-4">Cargando panel...</div>;
    const totalServicios = (reporte?.graficoTurnos || []).reduce((acc, curr) => acc + (curr?.value || 0), 0);
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const datosTendencia = meses.map(mes => {
        const encontrado = (reporte?.tendenciaMensual || []).find(item => item.mes === mes);
        return { mes, monto: encontrado ? encontrado.monto : 0 };
    });
    const datosTop = reporte?.topServicios || [];

    return (
        <div ref={dashboardRef} className="container-fluid p-4 p-md-5 min-vh-100 position-relative"
             style={{ 
                 backgroundImage: `url('https://i.pinimg.com/1200x/95/21/0f/95210f85d0c87c7e21952f56a9a834fd.jpg')`, 
                 backgroundSize: 'cover', 
                 backgroundAttachment: 'scroll', // 'scroll' ayuda a html2canvas a no marearse
                 backgroundPosition: 'center' 
             }}>

            <div style={{ position: 'absolute', inset: 0, background: 'rgba(102, 51, 153, 0.22)', zIndex: 1 }} />

            <div className="position-relative" style={{ zIndex: 2 }}>
                <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-white border-opacity-25 flex-wrap gap-3">
                    <div>
                        <h2 className="fw-bold text-white mb-0">Panel de reportes</h2>
                        <p className="text-white opacity-85 mb-0 fw-bold">Malfi Veterinaria • Tucumán</p>
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-success rounded-pill px-4 shadow-sm fw-bold border-0" onClick={exportarExcel} style={{ backgroundColor: '#28a745' }}>
                            <FontAwesomeIcon icon={faFileExcel} className="me-2" /> EXCEL
                        </button>
                        <button className="btn btn-danger rounded-pill px-4 shadow-sm fw-bold border-0" onClick={exportarPDF} style={{ backgroundColor: '#dc3545' }}>
                            <FontAwesomeIcon icon={faFilePdf} className="me-2" /> PDF COMPLETO
                        </button>
                    </div>
                </div>

                {/* Tarjetas Pequeñas */}
                <div className="row g-2 mb-5 justify-content-center">
                    {[
                        { label: 'VENTA HOY', val: reporte?.totales?.dia || 0, color: '#99cc33', icon: faCoins },
                        { label: 'ESTA SEMANA', val: reporte?.totales?.semana || 0, color: '#00bfff', icon: faCalendarWeek },
                        { label: 'MES ACTUAL', val: reporte?.totales?.mes || 0, color: '#ff69b4', icon: faCalendarDay },
                        { label: 'VENTA AÑO', val: reporte?.totales?.anio || 0, color: '#663399', icon: faCalendarAlt }
                    ].map((item, idx) => (
                        <div className="col-6 col-md-3" key={idx}>
                            <div className="card border-0 shadow-sm text-center p-3 h-100" style={glassStyle}>
                                <small className="fw-bold text-white opacity-70 mb-1 d-block">{item.label}</small>
                                <h4 className="fw-bold mb-0 text-white">${Number(item.val).toLocaleString('es-AR')}</h4>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="row g-5">
                    <div className="col-12"><div className="card border-0 p-4 dashboard-card" style={glassStyle}>
                        <h4 className="fw-bold text-white mb-3"><FontAwesomeIcon icon={faArrowTrendUp} className="text-success me-2" /> Evolución de Ventas</h4>
                        <div style={{ width: '100%', height: 450 }}><ResponsiveContainer><BarChart data={reporte.graficoVentas}><CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.12)" /><XAxis dataKey="dia" stroke="#fff" /><YAxis stroke="#fff" /><Tooltip content={<CustomTooltip />} /><Bar dataKey="total" fill="#99cc33" radius={[12, 12, 0, 0]} barSize={70} /></BarChart></ResponsiveContainer></div>
                    </div></div>

                    <div className="col-12"><div className="card border-0 p-4 dashboard-card" style={glassStyle}>
                        <h4 className="fw-bold text-white mb-3 text-center">Distribución de Servicios</h4>
                        <div style={{ width: '100%', height: 500, position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 10 }}>
                                <h1 className="fw-black text-white display-3 mb-0">{totalServicios}</h1>
                                <p className="text-white fw-bold fs-4">SERVICIOS</p>
                            </div>
                            <ResponsiveContainer><PieChart><Pie data={reporte.graficoTurnos} innerRadius={120} outerRadius={160} dataKey="value" stroke="none">{reporte.graficoTurnos.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip content={<CustomTooltip />} /><Legend verticalAlign="bottom" height={60} wrapperStyle={{ color: '#fff', fontSize: '15px', fontWeight: 'bold' }} /></PieChart></ResponsiveContainer>
                        </div>
                    </div></div>

                    <div className="col-12"><div className="card border-0 p-4 dashboard-card" style={glassStyle}>
                        <h4 className="fw-bold text-white mb-3">Tendencia Mensual</h4>
                        <div style={{ width: '100%', height: 450 }}><ResponsiveContainer><BarChart data={datosTendencia}><CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.12)" /><XAxis dataKey="mes" stroke="#fff" /><YAxis stroke="#fff" /><Tooltip content={<CustomTooltip />} /><Bar dataKey="monto" fill="#00d4ff" radius={[12, 12, 0, 0]} barSize={60} /></BarChart></ResponsiveContainer></div>
                    </div></div>

                    <div className="col-12"><div className="card border-0 p-4 dashboard-card" style={glassStyle}>
                        <h4 className="fw-bold text-white mb-3">Ranking de Facturación</h4>
                        <div style={{ width: '100%', height: 500 }}><ResponsiveContainer><BarChart data={datosTop} layout="vertical" margin={{ left: 180 }}><XAxis type="number" stroke="#fff" /><YAxis type="category" dataKey="servicio" stroke="#fff" width={170} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="ingresos" fill="#ff69b4" radius={[0, 12, 12, 0]} barSize={55} /></BarChart></ResponsiveContainer></div>
                    </div></div>
                </div>
            </div>
            <style>{`.recharts-text, .recharts-legend-item-text { fill: white !important; }`}</style>
        </div>
    );
};

export default DueñoDashboard;