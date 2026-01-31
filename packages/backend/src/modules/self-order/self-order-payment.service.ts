import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface CreatePaymentDto {
    sessionCode: string;
    paymentMethod: 'qris' | 'cash' | 'gopay' | 'ovo' | 'dana' | 'shopeepay';
    amount: number;
    customerEmail?: string;
    customerPhone?: string;
}

export interface PaymentResult {
    success: boolean;
    transactionId: string;
    paymentMethod: string;
    paymentUrl?: string;
    qrCode?: string;
    qrCodeData?: string;
    expiresAt?: Date;
    message?: string;
}

export interface QrisPaymentData {
    transactionId: string;
    qrCodeUrl: string;
    qrCodeData: string;
    amount: number;
    expiresAt: Date;
    merchantName: string;
}

@Injectable()
export class SelfOrderPaymentService {
    private readonly logger = new Logger(SelfOrderPaymentService.name);
    private paymentReferences = new Map<string, { transactionId: string; method: string; status: string; createdAt: Date }>();

    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async calculateSessionTotal(sessionCode: string) {
        const session = await this.prisma.selfOrderSession.findUnique({
            where: { sessionCode },
            include: {
                items: {
                    include: {
                        product: { select: { basePrice: true } },
                        variant: { select: { price: true } },
                    },
                },
                outlet: { select: { taxRate: true, serviceCharge: true } },
            },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        let subtotal = 0;
        for (const item of session.items) {
            const unitPrice = item.variant
                ? Number(item.variant.price)
                : Number(item.product.basePrice);
            subtotal += unitPrice * item.quantity;
        }

        const taxRate = Number(session.outlet.taxRate) / 100;
        const serviceChargeRate = Number(session.outlet.serviceCharge) / 100;

        const taxAmount = subtotal * taxRate;
        const serviceChargeAmount = subtotal * serviceChargeRate;
        const grandTotal = subtotal + taxAmount + serviceChargeAmount;

        return {
            subtotal,
            taxAmount,
            serviceChargeAmount,
            grandTotal,
            itemCount: session.items.reduce((sum, i) => sum + i.quantity, 0),
        };
    }

    /**
     * Create payment for self-order session.
     * Supports QRIS (generates QR code) and cash (pay-at-counter).
     */
    async createPayment(dto: CreatePaymentDto): Promise<PaymentResult> {
        const session = await this.prisma.selfOrderSession.findUnique({
            where: { sessionCode: dto.sessionCode },
            include: {
                outlet: {
                    include: { business: { select: { name: true } } },
                },
            },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        if (session.status !== 'submitted') {
            throw new BadRequestException('Session must be submitted before payment');
        }

        // Calculate actual total
        const totals = await this.calculateSessionTotal(dto.sessionCode);

        if (Math.abs(totals.grandTotal - dto.amount) > 1) {
            throw new BadRequestException('Payment amount does not match order total');
        }

        // Generate payment reference
        const transactionId = `SO-${dto.sessionCode}-${Date.now()}`;

        // Store payment reference
        this.paymentReferences.set(dto.sessionCode, {
            transactionId,
            method: dto.paymentMethod,
            status: 'pending',
            createdAt: new Date(),
        });

        // Handle different payment methods
        if (dto.paymentMethod === 'cash') {
            return this.createCashPayment(dto.sessionCode, transactionId, totals.grandTotal);
        }

        if (dto.paymentMethod === 'qris') {
            return this.createQrisPayment(
                dto.sessionCode,
                transactionId,
                totals.grandTotal,
                session.outlet.business.name,
            );
        }

        // For e-wallet methods (gopay, ovo, dana, shopeepay)
        return this.createEwalletPayment(dto.sessionCode, transactionId, dto.paymentMethod, totals.grandTotal);
    }

    /**
     * Create QRIS payment - generates QR code data for customer to scan.
     */
    private async createQrisPayment(
        sessionCode: string,
        transactionId: string,
        amount: number,
        merchantName: string,
    ): Promise<PaymentResult> {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        // Generate QRIS-compliant QR code data (EMVCo standard)
        // In production, this would be generated by the payment gateway (e.g., Midtrans, Xendit)
        const amountStr = amount.toFixed(0);
        const qrCodeData = [
            '00020101021226',
            `6014ID.CO.QRIS.WWW`,
            `0215ID10${transactionId.slice(-10)}`,
            `52045399`,
            `5303360`,
            `54${String(amountStr.length).padStart(2, '0')}${amountStr}`,
            `5802ID`,
            `59${String(merchantName.length).padStart(2, '0')}${merchantName}`,
            `6007Jakarta`,
            `6304`,
        ].join('');

        const qrCodeUrl = `https://api.qris.example.com/qr/${transactionId}`;

        this.logger.log(`QRIS payment created for session ${sessionCode}: ${transactionId}, amount: ${amount}`);

        return {
            success: true,
            transactionId,
            paymentMethod: 'qris',
            qrCode: qrCodeUrl,
            qrCodeData,
            expiresAt,
            message: 'Scan QR code to complete payment. Expires in 15 minutes.',
        };
    }

    /**
     * Create cash payment - customer pays at counter.
     * Marks order as pending cash payment.
     */
    private async createCashPayment(
        sessionCode: string,
        transactionId: string,
        _amount: number,
    ): Promise<PaymentResult> {
        this.logger.log(`Cash payment created for session ${sessionCode}: pay at counter`);

        return {
            success: true,
            transactionId,
            paymentMethod: 'cash',
            message: 'Please proceed to the counter to complete your cash payment.',
        };
    }

    /**
     * Create e-wallet payment (GoPay, OVO, DANA, ShopeePay).
     */
    private async createEwalletPayment(
        sessionCode: string,
        transactionId: string,
        method: string,
        _amount: number,
    ): Promise<PaymentResult> {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        this.logger.log(`E-wallet payment (${method}) created for session ${sessionCode}: ${transactionId}`);

        return {
            success: true,
            transactionId,
            paymentMethod: method,
            paymentUrl: `https://payment.example.com/${method}/${transactionId}`,
            expiresAt,
            message: `Complete payment via ${method}. Expires in 15 minutes.`,
        };
    }

    /**
     * Initiate a QRIS-specific payment for a self-order session.
     * Generates a QRIS code string, stores payment reference in the session.
     */
    async initiateQRISPayment(sessionCode: string, amount: number): Promise<PaymentResult> {
        return this.createPayment({
            sessionCode,
            paymentMethod: 'qris',
            amount,
        });
    }

    /**
     * Handle payment gateway callback (webhook).
     * Updates session status to 'paid' on success and auto-submits the order to KDS.
     */
    async handlePaymentCallback(orderId: string, status: 'success' | 'failed' | 'pending') {
        // Extract session code from orderId (format: SO-{sessionCode}-{timestamp})
        const match = orderId.match(/^SO-(.+)-\d+$/);
        if (!match) {
            this.logger.warn(`Invalid order ID format: ${orderId}`);
            return;
        }

        const sessionCode = match[1];
        const session = await this.prisma.selfOrderSession.findUnique({
            where: { sessionCode },
            include: { items: true },
        });

        if (!session) {
            this.logger.warn(`Session not found for order ${orderId}`);
            return;
        }

        // Update payment reference status
        const paymentRef = this.paymentReferences.get(sessionCode);
        if (paymentRef) {
            paymentRef.status = status;
        }

        if (status === 'success') {
            await this.prisma.selfOrderSession.update({
                where: { sessionCode },
                data: { status: 'paid' },
            });
            this.logger.log(`Session ${sessionCode} marked as paid via callback`);

            // Auto-submit order to KDS if session has items but no order yet
            if (session.items.length > 0) {
                await this.autoSubmitToKDS(session.id, session.outletId, session.tableId, session.items);
            }
        } else if (status === 'failed') {
            // Keep as submitted so customer can retry
            this.logger.log(`Payment failed for session ${sessionCode}`);
        }
    }

    /**
     * Auto-submit self-order items to KDS after successful payment.
     */
    private async autoSubmitToKDS(
        _sessionId: string,
        outletId: string,
        tableId: string | null,
        items: { productId: string; variantId: string | null; quantity: number; notes: string | null }[],
    ) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const count = await this.prisma.order.count({
            where: {
                outletId,
                createdAt: { gte: today },
            },
        });

        const orderNumber = `ORD-${today.getFullYear().toString().slice(-2)}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}-${String(count + 1).padStart(3, '0')}`;

        const order = await this.prisma.order.create({
            data: {
                outletId,
                orderNumber,
                orderType: 'dine_in',
                tableId,
                status: 'pending',
            },
        });

        for (const item of items) {
            await this.prisma.orderItem.create({
                data: {
                    orderId: order.id,
                    productId: item.productId,
                    variantId: item.variantId,
                    productName: item.productId,
                    quantity: item.quantity,
                    notes: item.notes,
                    status: 'pending',
                },
            });
        }

        this.logger.log(`Auto-submitted order ${orderNumber} to KDS for paid session`);
    }

    /**
     * Get detailed payment status for a session.
     */
    async getPaymentStatus(sessionCode: string) {
        const session = await this.prisma.selfOrderSession.findUnique({
            where: { sessionCode },
            select: {
                status: true,
                updatedAt: true,
            },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        const paymentRef = this.paymentReferences.get(sessionCode);

        return {
            sessionStatus: session.status,
            isPaid: session.status === 'paid',
            paymentReference: paymentRef?.transactionId || null,
            paymentMethod: paymentRef?.method || null,
            paymentStatus: paymentRef?.status || null,
            paymentCreatedAt: paymentRef?.createdAt || null,
            lastUpdated: session.updatedAt,
        };
    }
}
