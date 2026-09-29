const orders = {
    "ORD-101": {
        orderId: "ORD-101",
        customer: "Priya Shrama",
        produt: "Vitamin C Serum(30ml)",
        amount: 699,
        status: "Out for Delivery",
        courier: "BlueDart",
        trackingId: "BD-982103",
        expectedDelivery: "6 PM today"
    },
    "ORD-102": {
        orderId: "ORD-102",
        customer: "Rahul Verma",
        produt: "hydrating Sunscreen SPF 50",
        amount: 499,
        status: "Delivered",
        courier: "Delhivery",
        trackingId: "DL-441029",
        delivered: "14 days ago"
    },
    "ORD-103": {
        orderId: "ORD-103",
        customer: "Ananya Patel",
        produt: "Green Tea Face Wash + Toner",
        amount: 850, 
        status: "Processing",
        ordered: "3 hours ago",
        cancellationEligible: true,
    },
        "ORD-104": {
        orderId: "ORD-104",
        customer: "Rohit Patel",
        produt: "Toner",
        amount: 850, 
        status: "Cancelled",
        ordered: "3 hours ago",
    },
    
}

export default orders;