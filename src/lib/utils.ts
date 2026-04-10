export function normalizeDNI(dni: string): string {
    return dni.replace(/\D/g, '').trim();
}

export function formatDNI(dni: string): string {
    const cleaned = normalizeDNI(dni);
    if (cleaned.length === 0) return '';
    
    // Format as XX.XXX.XXX if possible, or just return cleaned
    if (cleaned.length > 5) {
        return cleaned.replace(/(\d+)(\d{3})(\d{3})$/, '$1.$2.$3');
    } else if (cleaned.length > 2) {
        return cleaned.replace(/(\d+)(\d{3})$/, '$1.$2');
    }
    return cleaned;
}
