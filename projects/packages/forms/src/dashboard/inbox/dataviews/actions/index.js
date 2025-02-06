import { store as coreStore } from '@wordpress/core-data';
import { __ } from '@wordpress/i18n';
import { seen, thumbsDown, thumbsUp } from '@wordpress/icons';
import { doBulkAction } from '../../../data/responses';
import { STORE_NAME } from '../../../state';
import { ACTIONS } from '../../constants';
import InboxResponse from '../../response';

export const viewAction = {
	id: 'view-response',
	label: __( 'View response', 'jetpack-forms' ),
	isPrimary: true,
	icon: seen,
	RenderModal: ( { items } ) => {
		const [ item ] = items;
		return <InboxResponse isLoading={ false } response={ item } />;
	},
};

export const markAsSpamAction = {
	id: 'mark-as-spam',
	label: __( 'Mark as spam', 'jetpack-forms' ),
	isEligible: item => item.post_status !== 'spam',
	supportsBulk: true,
	icon: thumbsDown,
	async callback( items, { registry } ) {
		const itemIds = items.map( ( { id } ) => id );
		const { addTabTotals, fetchResponses, removeResponses } = registry.dispatch( STORE_NAME );
		try {
			removeResponses( itemIds );
			// addTabTotals( {
			// 	[ currentTab ]: -1,
			// 	[ ACTION_TABS[ action ] ]: 1,
			// } );
			// await registry
			// 	.dispatch( coreStore )
			// 	.saveEntityRecord(
			// 		'postType',
			// 		'feedback',
			// 		{ id: item.id, status: 'spam' },
			// 		{ throwOnError: true }
			// 	);
			await doBulkAction( itemIds, ACTIONS.markAsSpam );

			// await fetchResponses(
			// 	{
			// 		...query,
			// 		limit: RESPONSES_FETCH_LIMIT,
			// 		offset: ( currentPage - 1 ) * RESPONSES_FETCH_LIMIT,
			// 	},
			// 	{ append: true }
			// );
		} catch {}
	},
};

export const markAsNotSpamAction = {
	id: 'mark-as-not-spam',
	label: __( 'Not spam', 'jetpack-forms' ),
	isEligible: item => item.post_status === 'spam',
	supportsBulk: true,
	icon: thumbsUp,
	async callback( items, { registry } ) {
		const itemIds = items.map( ( { id } ) => id );
		const { removeResponses } = registry.dispatch( STORE_NAME );
		try {
			removeResponses( itemIds );
			await doBulkAction( itemIds, ACTIONS.markAsNotSpam );
		} catch {}
	},
};
