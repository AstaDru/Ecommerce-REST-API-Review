const pool = require('../model/pool');
const bcrypt = require('bcrypt');
const validateCreditCard = require('../controllers/utils');

class Queries {
    constructor(schema){
        this.schema = schema;
    }

    async getAllFromSchema(){
        const products = await pool.query(`SELECT * FROM ${this.schema.name}`);
        return products.rows;
    }

    async getFromSchemaByCategory(){
        console.log('categories ' + JSON.stringify(this.schema));
        
        const products = await pool.query(`SELECT * FROM ${this.schema.name} WHERE category = '${this.schema.category}'`);
        if(!products.rows[0]) return {error: true, message: "Please enter a valid category"};
        return {error: false, products};
    }

    async getFromSchemaByName(){
        const products = await pool.query(`SELECT * FROM ${this.schema.name} WHERE name = '${this.schema.product}'`);
        return products;
    }

    async registerUser(){
        console.log('registerUser in queries.js');
        const {username, hashedPassword, firstName, lastName, email} = this.schema.userDetails;
        try {
            const user = await pool.query(`INSERT INTO customers (username, password, first_name, last_name, email) VALUES(
                '${username}', '${hashedPassword}', '${firstName}', '${lastName}', '${email}'
            )`);
            const userId = await pool.query(`SELECT id FROM customers WHERE username='${username}'`);
            return {error: false, data: userId.rows[0]};
        } catch(err) {
            console.log('err occured ' + JSON.stringify(err.message));
            
            return {error: true, errorMessage: "A problem occurred. Please try a different username and/or password"}
        };
    }


    async loginUser(){
        const {password, username} = this.schema;
        const user = await pool.query(`SELECT * from customers WHERE username='${username}'`);
        if(!user.rows[0]) return null;
        const matchedPassword = await bcrypt.compare(password, user.rows[0].password);
        if(matchedPassword) return {match: true, id: user.rows[0].id};
        return false;
    }

    async getFromCartByCustomerId(){
        const cart = await pool.query(`SELECT * FROM carts WHERE customer_id = ${this.schema.customerId}`);
        return cart;
    }

    async initCart(){
        console.log('init cart');
        
        const newCart = await pool.query(`INSERT INTO carts (customer_id) VALUES (${this.schema.customerId})`);
        return newCart;
    }

    async addProductToCart(){
        console.log('add product addProductToCart');
        console.log(this.schema);
        
        try {
            const cartId = await pool.query(`SELECT * FROM carts WHERE customer_id = ${this.schema.customerId}`);
            if (!cartId.rows[0] ) return {cartError:true, productError:false};
            const updatedCart = await pool.query(`INSERT INTO carts (id, customer_id, product_id, quantity) VALUES (
                ${cartId.rows[0].id}, ${this.schema.customerId}, ${this.schema.productId}, '${this.schema.quantity}'
            )`);
            return updatedCart;
        } catch(err) {
            console.log('err occured: ' + JSON.stringify(err.message));
            
            return {cartError:false, productError:true};
        };
    }

    async removeProductFromCart(){
        const updatedCart = await pool.query(`DELETE FROM carts WHERE customer_id=${this.schema.customerId} AND product_id=${this.schema.productId} RETURNING *`);
        return updatedCart;

    }

    async checkoutCart(){
        const cart = await pool.query(`SELECT quantity, price::money::numeric::float8 as converted_price FROM carts JOIN products ON carts.product_id = products.id WHERE customer_id = ${this.schema.customerId}`);
        if(!cart.rows[0]) return "Please Initialize a cart or add products to your cart";
        let totalPrice = 0;
        console.log('cart.rows: ' + JSON.stringify(cart.rows));
        
        for (let item of cart.rows){
            console.log('item from cart: ' + JSON.stringify(item));
            
            totalPrice+=item.converted_price * item.quantity};
        if( totalPrice === 0 || typeof(totalPrice)=='undefined' ) return "Please add items to your cart";
        if(this.schema.paymentMethod==="Credit card"){
            if(!validateCreditCard(this.schema.creditCardNumber)) {
                console.log('val false');
                
                return "Please enter a valid credit card number";}
        };
        console.log('goes quering total: '+ JSON.stringify(totalPrice));
        
        await pool.query(`DELETE FROM carts WHERE customer_id=${this.schema.customerId}`);
        await pool.query(`INSERT INTO checked_out_carts (customer_id, total_price, date, time, payment_method) VALUES (${this.schema.customerId}, ${totalPrice}, '1991-11-22', '11:22:12', '${this.schema.paymentMethod}')`);
        return 'Successfully checked out! Thank you!';
    }

    async getUserHistory(){
        const userHistory = await pool.query(`SELECT * FROM checked_out_carts WHERE customer_id=${this.schema.customerId}`);
        if(!userHistory.rows[0]) return "No history! Buy something first!";
        return userHistory.rows;
    }
};


module.exports = Queries;