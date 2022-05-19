import tsc, { Node, ScriptTarget, SyntaxKind } from 'typescript'

const code = `


function charge(amt: number, callback: () => void) {
    const that = this;
    const handler = (<any>window).StripeCheckout.configure({
        key: environment.stripeKey,
        locale: 'auto',
        token: function (token: any) {
            that.ns.alert('Payment in progress');
            that.http
                .post(environment.backendUrl + '/v1/charge', {
                paymentToken: token.id,
                token: that.ss.getToken(),
                amount: amt
            })
                .subscribe(data => {
                that.ns.success('Thank you', 'Your payment was successful');
                callback();
            }, error => {
                that.ns.error(error);
            });
        }
    });
    handler.open({
        name: 'Buy ' + Math.floor(100000 * amt / pricePer100k) + ' quota',
        description: '',
        amount: amt
    });
}


`

const sourceFile = tsc.createSourceFile('temp.ts', code, ScriptTarget.ESNext, true)

let x: number = 0
const comment = (s: Node) => {
	tsc.addSyntheticLeadingComment(s, SyntaxKind.MultiLineCommentTrivia, `<${SyntaxKind[s.kind]}>`, false)
	tsc.addSyntheticTrailingComment(s, SyntaxKind.MultiLineCommentTrivia, `</${SyntaxKind[s.kind]}>`, false)
	x++
}

const ALLOWED_MASKS = [
	SyntaxKind.VariableDeclarationList,
	SyntaxKind.ExpressionStatement,
	SyntaxKind.BinaryExpression,
	SyntaxKind.AwaitExpression,
	SyntaxKind.PrefixUnaryExpression,
	SyntaxKind.PostfixUnaryExpression,
]

function commentAllowed(node: Node) {
	if (ALLOWED_MASKS.includes(node.kind)) {
		comment(node)
	} else {
		node.forEachChild(commentAllowed)
	}
}

function rec(node: Node) {
	comment(node)
	node.forEachChild(rec)
}

commentAllowed(sourceFile)

console.log(tsc.createPrinter({ removeComments: false }).printFile(sourceFile))

const aa= `



function charge(amt: number, callback: () => void) {
    const that = this
    const handler = (<any>window).StripeCheckout.configure({
        key: environment.stripeKey,
        locale: 'auto',
        token: function (token: any) {
            that.ns.alert('Payment in progress');
            that.http
                .post(environment.backendUrl + '/v1/charge', {
                paymentToken: token.id,
                token: that.ss.getToken(),
                amount: amt
            })
                .subscribe(data => {
                that.ns.success('Thank you', 'Your payment was successful');
                callback();
            }, error => {
                that.ns.error(error);
            });
        }
    }) /*</mask>*/;
    /*<ExpressionStatement>*/ handler.open({
        name: 'Buy ' + Math.floor(100000 * amt / pricePer100k) + ' quota',
        description: '',
        amount: amt
    }); /*</ExpressionStatement>*/
}

`
