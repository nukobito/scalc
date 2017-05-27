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
    parse( tokenizer ) {
        while ( tokenizer.peekToken().kind !== Kind.Empty ) {
            new StatementNode().parse( tokenizer );
        }
    }
}

class StatementNode {
    parse( tokenizer ) {
        new ExpressionNode().parse( tokenizer );
        if ( tokenizer.peekToken().kind !== Kind.Semicolon ) {
            throw new ParseError( tokenizer.peekToken().value, ';' );
        }
        tokenizer.moveNextToken();
    }
}

class ExpressionNode {
    parse( tokenizer ) {
        if ( tokenizer.peekToken().kind === Kind.Identifer && tokenizer.peekToken( 1 ).kind === Kind.Equals ) {
            new IdentiferNode().parse( tokenizer );
            tokenizer.moveNextToken();
            new ExpressionNode().parse( tokenizer );
            console.log( 'code: store' );
        }
        else {
            new TermNode().parse( tokenizer );
            let token = tokenizer.peekToken();
            if ( token.kind === Kind.Plus || token.kind === Kind.Hyphen ) {
                tokenizer.moveNextToken();
                new TermNode().parse( tokenizer );
                if ( token.kind === Kind.Plus ) {
                    console.log( 'code: add' );
                }
                else {
                    console.log( 'code: sub' );
                }
            }
        }
    }
}

class TermNode {
    parse( tokenizer ) {
        new FactorNode().parse( tokenizer );
        let token = tokenizer.peekToken();
        if ( token.kind === Kind.Asterisk || token.kind === Kind.Slash ) {
            tokenizer.moveNextToken();
            new FactorNode().parse( tokenizer );
            if ( token.kind === Kind.Asterisk ) {
                console.log( 'code: mul')
            }
            else {
                console.log( 'code: div')
            }
        }
    }
}

class FactorNode {
    parse( tokenizer ) {
        let token = tokenizer.peekToken();
        switch ( token.kind ) {
            case Kind.OpenParenthesis:
                tokenizer.moveNextToken();
                new ExpressionNode().parse( tokenizer );
                token = tokenizer.peekToken();
                if ( token.kind !== Kind.CloseParenthesis ) {
                    throw new ParseError( token.value, ')' );
                }
                tokenizer.moveNextToken();
                break;
            case Kind.Identifer:
                new IdentiferNode().parse( tokenizer );
                console.log( 'code: load' );
                break;
            case Kind.Hyphen:
            case Kind.Value:
                new ValueNode().parse( tokenizer );
                break;

            default:
                throw new ParseError( token.value, '<factor>' );
        }
    }
}

class IdentiferNode {
    parse( tokenizer ) {
        let token = tokenizer.peekToken();
        if ( token.kind !== Kind.Identifer ) {
            throw new ParseError( token.value, '<identifer>' );
        }
        let identifer = token.value;    // TODO: This!
        tokenizer.moveNextToken();
        console.log( 'code: push &' + identifer );
    }
}

class ValueNode {
    parse( tokenizer ) {
        let sign = 1;
        let token = tokenizer.peekToken();
        if ( !(token.kind === Kind.Hyphen || token.kind === Kind.Value) ) {
            throw new ParseError( token.value, '- or <value>' );
        }
        if ( tokenizer.peekToken().kind === Kind.Hyphen ) {
            sign = -1;
            tokenizer.moveNextToken();
        }
        let value = tokenizer.peekToken().value * sign;     // TODO: This!
        tokenizer.moveNextToken();
        console.log( 'code: push ' + value );
    }
}








let tokenizer = new Tokenizer( 'hp=10; damage=5; hp/damage+(1.25*2);' );
new BlockNode().parse( tokenizer );