import  { useState, useEffect, useRef } from 'react';
import { 
    Box, Typography, Button, Paper, 
    FormControl, InputLabel, Select, MenuItem, TextField, CircularProgress,
    Card, CardContent, useTheme, IconButton, Alert, AlertTitle
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { CheckCircle, Cancel, Autorenew, DeleteOutline, InfoOutlined, CloudSync } from '@mui/icons-material';
import { pingTally, resetTallySyncMemory } from '../../services/tallyApi';
import { useTallySync } from '../../context/TallySyncContext';
import DashboardHeader from '../../components/DashboardHeader';

export default function TallyDashboard() {
    const theme = useTheme();
    const { syncing, logs, startSync, clearLogs } = useTallySync();
    
    const [isConnected, setIsConnected] = useState<boolean | null>(null);
    const [statusMsg, setStatusMsg] = useState('');
    
    const [syncType, setSyncType] = useState('masters');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const logsEndRef = useRef<HTMLDivElement>(null);

    const checkConnection = async () => {
        try {
            const res = await pingTally();
            setIsConnected(res.connected);
            setStatusMsg(res.message);
        } catch (e: any) {
            setIsConnected(false);
            setStatusMsg(e.message || 'Error connecting to Tally');
        }
    };

    useEffect(() => {
        checkConnection();
    }, []);

    // Auto-scroll logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const handleResetMemory = async () => {
        if (!window.confirm("Are you sure you want to reset the sync memory? If you are syncing to a new Tally Company, this will allow all data to be synced again from scratch. It will NOT delete data in Tally.")) return;
        try {
            await resetTallySyncMemory();
            alert("Sync memory reset successfully. You can now sync all data to a fresh Tally company.");
            checkConnection();
        } catch (e: any) {
            console.error(e);
            alert("Failed to reset sync memory.");
        }
    };

    const handleStartSync = () => {
        if (!isConnected || syncing) return;
        startSync(syncType, startDate, endDate);
    };

    // Helper for log coloring
    const getLogColor = (log: string) => {
        if (log.includes('[ERROR]')) return theme.palette.error.light;
        if (log.includes('[SUCCESS]')) return theme.palette.success.light;
        if (log.includes('[SYSTEM]')) return theme.palette.secondary.light; // Gold
        return '#bbbbbb'; // Standard text
    };

    const getSyncDescription = () => {
        switch (syncType) {
            case 'masters':
                return "Pushes all Customers, Suppliers, and Products to Tally as Ledgers and Stock Items. You MUST run this first before syncing any vouchers.";
            case 'sales':
                return "Pushes all Sales Invoices to Tally. Ensure you select the date range you wish to sync.";
            case 'purchases':
                return "Pushes all Purchase Bills to Tally. Ensure you select the date range you wish to sync.";
            case 'transactions':
                return "Pushes all Receipts, Payments, and Notes to Tally. This handles your cash/bank entries against customers and suppliers.";
            case 'expenses':
                return "Pushes all indirect expenses to Tally as Journal/Payment vouchers.";
            default:
                return "";
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto', minHeight: '100vh' }}>
            {/* Header Section */}
            <DashboardHeader 
                title="Tally Prime Synchronization Engine" 
                showDateFilters={false} 
                showSearch={false} 
                actions={
                    syncing && (
                        <Paper elevation={2} sx={{ display: 'flex', alignItems: 'center', p: 1, px: 2, borderRadius: 50, bgcolor: theme.palette.primary.main, color: theme.palette.secondary.main }}>
                            <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                            <Typography variant="caption" sx={{ fontWeight: 'bold', letterSpacing: 0.5 }}>SYNC IN PROGRESS</Typography>
                        </Paper>
                    )
                }
            />
            
            <Grid container spacing={4} sx={{ mt: 1 }}>
                {/* Top Row: Cards Side by Side */}
                <Grid item xs={12} md={6}>
                    <Card elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', height: '100%' }}>
                        <Box sx={{ p: 2, bgcolor: theme.palette.primary.main, color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
                                SYSTEM CONNECTION
                            </Typography>
                        </Box>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                {isConnected === true ? (
                                    <CheckCircle sx={{ color: theme.palette.success.main, mr: 1.5, fontSize: 32 }} />
                                ) : isConnected === false ? (
                                    <Cancel sx={{ color: theme.palette.error.main, mr: 1.5, fontSize: 32 }} />
                                ) : (
                                    <CircularProgress size={28} sx={{ mr: 2 }} />
                                )}
                                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                                    {isConnected === true ? 'Tally is Connected' : isConnected === false ? 'Tally is Disconnected' : 'Checking Connection...'}
                                </Typography>
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, ml: 5.5 }}>
                                {statusMsg || 'Listening on localhost port 9000.'}
                            </Typography>
                            
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Button 
                                        variant="outlined" 
                                        onClick={checkConnection} 
                                        startIcon={<Autorenew />}
                                        fullWidth
                                        sx={{ py: 1, fontWeight: 600, borderRadius: 2 }}
                                    >
                                        Check Again
                                    </Button>
                                </Grid>
                                <Grid item xs={6}>
                                    <Button 
                                        variant="outlined" 
                                        color="error" 
                                        onClick={handleResetMemory} 
                                        fullWidth
                                        sx={{ py: 1, fontWeight: 600, borderRadius: 2 }}
                                    >
                                        Reset Sync Memory
                                    </Button>
                                </Grid>
                            </Grid>
                            
                            <Alert severity="info" icon={<InfoOutlined />} sx={{ mt: 4, borderRadius: 2 }}>
                                <AlertTitle sx={{ fontWeight: 600 }}>What is Reset Memory?</AlertTitle>
                                Use this <strong>only</strong> if you have deleted the Tally company and created a new one, and need to re-sync all data from scratch.
                            </Alert>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', height: '100%' }}>
                        <Box sx={{ p: 2, bgcolor: theme.palette.primary.main, color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
                                SYNC OPERATION
                            </Typography>
                        </Box>
                        <CardContent sx={{ p: 3 }}>
                            <FormControl fullWidth sx={{ mb: 3 }}>
                                <InputLabel sx={{ fontWeight: 500 }}>Select Data to Sync</InputLabel>
                                <Select
                                    value={syncType}
                                    label="Select Data to Sync"
                                    onChange={(e) => setSyncType(e.target.value)}
                                    disabled={syncing}
                                    sx={{ borderRadius: 2 }}
                                >
                                    <MenuItem value="masters">1. All Masters (Ledgers & Items)</MenuItem>
                                    <MenuItem value="sales">2. Sales Vouchers</MenuItem>
                                    <MenuItem value="purchases">3. Purchase Vouchers</MenuItem>
                                    <MenuItem value="transactions">4. Transactions (Receipts & Payments)</MenuItem>
                                    <MenuItem value="expenses">5. Expenses</MenuItem>
                                </Select>
                            </FormControl>

                            <Alert severity="success" sx={{ mb: 4, borderRadius: 2, bgcolor: `${theme.palette.success.main}15` }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {getSyncDescription()}
                                </Typography>
                            </Alert>

                            {(syncType === 'sales' || syncType === 'purchases' || syncType === 'transactions' || syncType === 'expenses') && (
                                <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                                    <TextField
                                        label="Start Date"
                                        type="date"
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        disabled={syncing}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                    />
                                    <TextField
                                        label="End Date"
                                        type="date"
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        disabled={syncing}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                    />
                                </Box>
                            )}

                            <Button 
                                variant="contained" 
                                color="secondary"
                                fullWidth 
                                onClick={handleStartSync}
                                disabled={!isConnected || syncing}
                                sx={{ 
                                    py: 2, 
                                    fontWeight: 800, 
                                    fontSize: '1.05rem',
                                    color: theme.palette.secondary.contrastText,
                                    boxShadow: 3,
                                    borderRadius: 2
                                }}
                            >
                                {syncing ? 'SYNC RUNNING IN BACKGROUND...' : 'START SYNC PROCESS'}
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Bottom Row: Terminal */}
                <Grid item xs={12}>
                    <Paper 
                        elevation={4} 
                        sx={{ 
                            height: '100%', 
                            minHeight: 400, 
                            display: 'flex', 
                            flexDirection: 'column',
                            borderRadius: 3,
                            overflow: 'hidden',
                            bgcolor: '#0a0e17', 
                            border: '1px solid #1f2b44'
                        }}
                    >
                        {/* Terminal Header */}
                        <Box sx={{ 
                            p: 1.5, 
                            bgcolor: '#141d2e', 
                            borderBottom: '1px solid #1f2b44',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1 }}>
                                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ff5f56' }} />
                                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
                                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#27c93f' }} />
                                <Typography sx={{ color: '#8b9bb4', fontSize: '0.85rem', ml: 2, fontFamily: 'monospace', fontWeight: 600 }}>
                                    kosh-tally-bridge ~ bash
                                </Typography>
                            </Box>
                            <IconButton 
                                size="small" 
                                onClick={clearLogs} 
                                disabled={syncing || logs.length === 0}
                                sx={{ color: '#8b9bb4', '&:hover': { color: 'white' } }}
                                title="Clear Logs"
                            >
                                <DeleteOutline fontSize="small" />
                            </IconButton>
                        </Box>
                        
                        {/* Terminal Body */}
                        <Box sx={{ 
                            flexGrow: 1, 
                            p: 3, 
                            fontFamily: '"Fira Code", "Courier New", monospace',
                            fontSize: '0.95rem',
                            overflowY: 'auto',
                            maxHeight: 500,
                            lineHeight: 1.7
                        }}>
                            {logs.length === 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5, py: 4 }}>
                                    <CloudSync sx={{ fontSize: 64, color: '#5b6b84', mb: 2 }} />
                                    <Typography sx={{ color: '#5b6b84', fontFamily: 'monospace', fontSize: '1rem' }}>
                                        $ awaiting commands...
                                    </Typography>
                                </Box>
                            ) : (
                                logs.map((log, i) => (
                                    <Box key={i} sx={{ 
                                        color: getLogColor(log),
                                        wordBreak: 'break-word',
                                        mb: 0.75,
                                        display: 'flex',
                                        alignItems: 'flex-start'
                                    }}>
                                        <span style={{ color: '#5b6b84', marginRight: '12px', userSelect: 'none' }}>{`>`}</span>
                                        <Box component="span" sx={{ flexGrow: 1 }}>{log}</Box>
                                    </Box>
                                ))
                            )}
                            <div ref={logsEndRef} style={{ float:"left", clear: "both" }} />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
