#!/usr/bin/env node

'use strict';

// ========================================================
//      Objects.
// --------------------------------------------------------
const Kind = {
    Empty: -1,

    Plus: '+'.charCodeAt( 0 ),
    Hyphen: '-'.charCodeAt( 0 ),
    Asterisk: '*'.charCodeAt( 0 ),
    Slash: '/'.charCodeAt( 0 ),
    Percent: '%'.charCodeAt( 0 ),
    Equals: '='.charCodeAt( 0 ),

    Semicolon: ';'.charCodeAt( 0 ),
    OpenParenthesis: '('.charCodeAt( 0 ),
    CloseParenthesis: ')'.charCodeAt( 0 ),

    Value: 150,
    Identifer: 151
};

// ========================================================
//      Classes.
// --------------------------------------------------------
class ParseError extends Error {
    constructor( errorToken = '', needToken = '' ) {
        super( 'Parse error. Error token is ' + errorToken + '. Need token is ' + needToken + '.' );
    }
}

class Token {
    constructor( kind, value ) {
        this.kind = kind;
        this.value = value;
    }
}

class Tokenizer {
    constructor( text ) {
        this._text = text;
        this._pos = 0;

        this._tokens = [];
        this._index = 0;
        this._tokenize();
    }
    peekToken( step = 0 ) {
        let token = this._tokens[ this._index + step ];
        return token === undefined ? new Token( Kind.Empty, '' ) : token;
    }
    moveNextToken() {
        if ( this._index < this._tokens.length ) {
            this._index++;
        }
    }
    _tokenize() {
        while ( true ) {
            this._skipWhitespace();
            let ch = this._peekChar();
            if ( this._isDigit( ch ) ) {
                let sum = 0;
                while ( this._isDigit( ch = this._peekChar() ) ) {
                    sum = sum * 10 + parseInt( ch, 10 );
                    this._moveNextChar();
                }
                if ( this._peekChar() === '.' ) {
                    this._moveNextChar();
                    let pow = 1;
                    while ( this._isDigit( ch = this._peekChar() ) ) {
                        sum = sum * 10 + parseInt( ch, 10 );
                        pow *= 10;
                        this._moveNextChar();
                    }
                    sum /= pow;
                }
                this._tokens.push( new Token( Kind.Value, sum ) );
            }
            else if ( this._isAlpha( ch ) ) {
                let s = '';
                while ( this._isAlpha( ch = this._peekChar() ) ) {
                    s += this._peekChar();
                    this._moveNextChar();
                }
                this._tokens.push( new Token( Kind.Identifer, s ) );
            }
            else {
                switch ( ch ) {
                    case '': return undefined;

                    case '+': this._tokens.push( new Token( Kind.Plus, '+' ) ); break;
                    case '-': this._tokens.push( new Token( Kind.Hyphen, '-' ) ); break;
                    case '*': this._tokens.push( new Token( Kind.Asterisk, '*' ) ); break;
                    case '/': this._tokens.push( new Token( Kind.Slash, '/' ) ); break;
                    case '%': this._tokens.push( new Token( Kind.Percent, '%' ) ); break;
                    case '=': this._tokens.push( new Token( Kind.Equals, '=' ) ); break;
                    case ';': this._tokens.push( new Token( Kind.Semicolon, ';' ) ); break;
                    case '(': this._tokens.push( new Token( Kind.OpenParenthesis, '(' ) ); break;
                    case ')': this._tokens.push( new Token( Kind.CloseParenthesis, ')' ) ); break;

                    default:
                        throw new Error( 'Tokenize error.');
                }
                this._moveNextChar();
            }
        }
    }
    _isSpace( ch ) {
        return ch === ' ' |
               ch === '\t' |
               ch === '\n' |
               ch === '\r' |
               ch === '\f';
    }
    _isDigit( ch ) {
        const c = ch.charCodeAt( 0 ),
              zero = '0'.charCodeAt( 0 ),
              nine = '9'.charCodeAt( 0 );
        return zero <= c && c <= nine;
    }
    _isAlpha( ch ) {
        const c = ch.charCodeAt( 0 ),
            A = 'A'.charCodeAt( 0 ), Z = 'Z'.charCodeAt( 0 ),
            a = 'a'.charCodeAt( 0 ), z = 'z'.charCodeAt( 0 );
        return (A <= c && c <= Z) || (a <= c && c <= z);
    }
    _skipWhitespace() {
        while( this._isSpace( this._text[ this._pos ] ) ) {
            this._pos++;
        }
    }
    _peekChar() {
        let ch = this._text[ this._pos ];
        return ch === undefined ? '' : ch;
    }
    _moveNextChar() {
        if ( this._pos < this._text.length ) {
            this._pos++;
        }
    }
}

class BlockNode {
    parse( tokenizer, codes ) {
        while ( tokenizer.peekToken().kind !== Kind.Empty ) {
            new StatementNode().parse( tokenizer, codes );
        }
    }
}

class StatementNode {
    parse( tokenizer, codes ) {
        new ExpressionNode().parse( tokenizer, codes );
        if ( tokenizer.peekToken().kind !== Kind.Semicolon ) {
            throw new ParseError( tokenizer.peekToken().value, ';' );
        }
        tokenizer.moveNextToken();
    }
}

class ExpressionNode {
    parse( tokenizer, codes ) {
        if ( tokenizer.peekToken().kind === Kind.Identifer && tokenizer.peekToken( 1 ).kind === Kind.Equals ) {
            new IdentiferNode().parse( tokenizer, codes );
            tokenizer.moveNextToken();
            new ExpressionNode().parse( tokenizer, codes );
            codes.push( 'store' );
        }
        else {
            new TermNode().parse( tokenizer, codes );
            let token = tokenizer.peekToken();
            if ( token.kind === Kind.Plus || token.kind === Kind.Hyphen ) {
                tokenizer.moveNextToken();
                new TermNode().parse( tokenizer, codes );
                if ( token.kind === Kind.Plus ) {
                    codes.push( 'add' );
                }
                else {
                    codes.push( 'sub' );
                }
            }
        }
    }
}

class TermNode {
    parse( tokenizer, codes ) {
        new FactorNode().parse( tokenizer, codes );
        let token = tokenizer.peekToken();
        if ( token.kind === Kind.Asterisk || token.kind === Kind.Slash || token.kind === Kind.Percent ) {
            tokenizer.moveNextToken();
            new FactorNode().parse( tokenizer, codes );
            if ( token.kind === Kind.Asterisk ) {
                codes.push( 'mul' );
            }
            else if ( token.kind === Kind.Slash ) {
                codes.push( 'div' );
            }
            else {
                codes.push( 'mod' );
            }
        }
    }
}

class FactorNode {
    parse( tokenizer, codes ) {
        let token = tokenizer.peekToken();
        switch ( token.kind ) {
            case Kind.OpenParenthesis:
                tokenizer.moveNextToken();
                new ExpressionNode().parse( tokenizer, codes );
                token = tokenizer.peekToken();
                if ( token.kind !== Kind.CloseParenthesis ) {
                    throw new ParseError( token.value, ')' );
                }
                tokenizer.moveNextToken();
                break;
            case Kind.Identifer:
                new IdentiferNode().parse( tokenizer, codes );
                codes.push( 'load' );
                break;
            case Kind.Hyphen:
            case Kind.Value:
                new ValueNode().parse( tokenizer, codes );
                break;

            default:
                throw new ParseError( token.value, '<factor>' );
        }
    }
}

class IdentiferNode {
    parse( tokenizer, codes ) {
        let token = tokenizer.peekToken();
        if ( token.kind !== Kind.Identifer ) {
            throw new ParseError( token.value, '<identifer>' );
        }
        let identifer = token.value;
        tokenizer.moveNextToken();
        codes.push( 'pushi ' + identifer );
    }
}

class ValueNode {
    parse( tokenizer, codes ) {
        let sign = 1;
        let token = tokenizer.peekToken();
        if ( !(token.kind === Kind.Hyphen || token.kind === Kind.Value) ) {
            throw new ParseError( token.value, '- or <value>' );
        }
        if ( tokenizer.peekToken().kind === Kind.Hyphen ) {
            sign = -1;
            tokenizer.moveNextToken();
        }
        let value = tokenizer.peekToken().value * sign;
        tokenizer.moveNextToken();
        codes.push( 'pushv ' + value );
    }
}

class VM {
    constructor() {
        this.address = [];
        this.memory = [];
        this.stack = [];
    }
    run( codes ) {
        let a, b, result;
        for ( let code of codes ) {
            let [ m, o ] = code.split( ' ' );
            switch ( m ) {
                case 'pushi':
                    a = this.address.findIndex( ( e ) => {
                        return e === o;
                    } );
                    if ( a === -1 ) {
                        a = this.address.push( o ) - 1;
                    }
                    this.stack.push( a );
                    break;
                case 'pushv':
                    a = parseInt( o, 10 );
                    this.stack.push( a );
                    break;
                case 'store':
                    a = this.stack.pop();
                    b = this.stack.pop();
                    this.memory[ b ] = a;
                    result = a;
                    break;
                case 'load':
                    a = this.stack.pop();
                    this.stack.push( this.memory[ a ] );
                    break;
                case 'add':
                    a = this.stack.pop();
                    b = this.stack.pop();
                    this.stack.push( b + a );
                    break;
                case 'sub':
                    a = this.stack.pop();
                    b = this.stack.pop();
                    this.stack.push( b - a );
                    break;
                case 'mul':
                    a = this.stack.pop();
                    b = this.stack.pop();
                    this.stack.push( b * a );
                    break;
                case 'div':
                    a = this.stack.pop();
                    b = this.stack.pop();
                    this.stack.push( b / a );
                    break;
                case 'mod':
                    a = this.stack.pop();
                    b = this.stack.pop();
                    this.stack.push( b % a );
                    break;
            }
        }
        return result === undefined ? this.stack[ 0 ] : result;
    }
}

// ========================================================
//      Entry point.
// --------------------------------------------------------
let arg = process.argv[ 2 ];
if ( arg !== undefined ) {
    let tokenizer = new Tokenizer( arg );
    let codes = [];
    new BlockNode().parse( tokenizer, codes );
    console.log( new VM().run( codes ) );
}