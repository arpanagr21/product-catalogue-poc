<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['product_id', 'product_title', 'name', 'email', 'phone', 'message'])]
class Enquiry extends Model {}
